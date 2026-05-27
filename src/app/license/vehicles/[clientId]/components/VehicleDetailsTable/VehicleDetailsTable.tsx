'use client';
import { FC, useContext, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { PaginatedTableIdentityAPI } from '@/components/Table';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { Loader } from '@/components/Loader';
import {
  buildColumns,
  PAGE_SIZE,
} from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';
import { RenounceVehicleModal } from '@/app/license/vehicles/[clientId]/components/RenounceVehicleModal';
import { getSimulatedVehicles } from '@/actions/simulatedVehicles';
import { useRenounceVehiclePermissions } from '@/hooks/useRenounceVehiclePermissions';
import { NotificationContext } from '@/context/notificationContext';
import { useRouter } from 'next/navigation';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';

type VehicleNode = GetVehiclesByClientIdQuery['vehicles']['nodes'][0];

interface IProps {
  clientId: string;
}

export const VEHICLES_BY_CLIENT_ID = gql(`
  query GetVehiclesByClientId($clientId: Address!, $first: Int, $last: Int, $before: String, $after: String) {
    vehicles(filterBy:{ privileged: $clientId }, first: $first, last: $last, before:$before, after:$after) {
      totalCount
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      nodes {
        tokenId
        tokenDID
        definition {
          make
          model
          year
        }
      }  
    }
  }
`);

export const VehicleDetailsTable: FC<IProps> = ({ clientId }) => {
  const router = useRouter();
  const { data, refetch, loading, error } = useQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, first: PAGE_SIZE },
  });
  const [simulatedTokenIds, setSimulatedTokenIds] = useState<Set<number>>(new Set());
  const [renouncingVehicle, setRenouncingVehicle] = useState<VehicleNode | null>(null);
  const [removedTokenIds, setRemovedTokenIds] = useState<Set<number>>(new Set());
  const { renounce } = useRenounceVehiclePermissions();
  const { setNotification } = useContext(NotificationContext);

  useEffect(() => {
    getSimulatedVehicles({ clientId }).then((vehicles) => {
      setSimulatedTokenIds(new Set(vehicles.map((v) => v.token_id)));
    });
  }, [clientId]);

  const handleRenounce = async () => {
    if (!renouncingVehicle) return;
    const { tokenId } = renouncingVehicle;
    try {
      await renounce(tokenId);
      // Optimistic removal
      setRemovedTokenIds((prev) => new Set([...prev, tokenId]));
      setRenouncingVehicle(null);
      setNotification('Access renounced', 'Success', 'success');
      // Background sync
      refetch();
    } catch (e: unknown) {
      Sentry.captureException(e);
      setNotification('Failed to renounce access', 'Error', 'error');
      throw e; // let modal display the inline error
    }
  };

  if (error) {
    return <p>Error: {error.message}</p>;
  }
  if (loading) {
    return <Loader isLoading />;
  }
  if (!data) {
    return null;
  }

  const visibleNodes = data.vehicles.nodes.filter(
    (n: VehicleNode) => !removedTokenIds.has(n.tokenId),
  );
  const visibleCount = data.vehicles.totalCount - removedTokenIds.size;

  return (
    <>
      <PaginatedTableIdentityAPI
        data={visibleNodes}
        columns={buildColumns(simulatedTokenIds, (tokenId) => {
          const node =
            data.vehicles.nodes.find((n: VehicleNode) => n.tokenId === tokenId) ?? null;
          setRenouncingVehicle(node);
        })}
        onPaginationChange={refetch}
        rowCount={visibleCount}
        pageInfo={data.vehicles.pageInfo}
        pageSize={PAGE_SIZE}
        onRowClick={(row) => router.push(`/explorer/${row.tokenId}`)}
      />
      <RenounceVehicleModal
        vehicle={renouncingVehicle}
        onConfirm={handleRenounce}
        onClose={() => setRenouncingVehicle(null)}
      />
    </>
  );
};
