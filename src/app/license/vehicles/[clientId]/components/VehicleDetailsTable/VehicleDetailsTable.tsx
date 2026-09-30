'use client';
import { FC, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { PaginatedTableIdentityAPI } from '@/components/Table';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { Loader } from '@/components/Loader';
import {
  buildColumns,
  PAGE_SIZE,
  type VehicleRow,
} from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';
import { RenounceVehicleModal } from '@/app/license/vehicles/[clientId]/components/RenounceVehicleModal';
import { getSimulatedVehicles } from '@/actions/simulatedVehicles';
import { useRenounceVehiclePermissions } from '@/hooks/useRenounceVehiclePermissions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';

type VehicleNode = GetVehiclesByClientIdQuery['vehicles']['nodes'][0];

interface IProps {
  clientId: string;
  // Filters from the /vehicles search box. owner narrows the list; tokenIdSearch
  // looks one vehicle up and shows whether it is shared with the license.
  owner?: string;
  tokenIdSearch?: number | null;
  showSources?: boolean;
  showLastSeen?: boolean;
}

export const VEHICLES_BY_CLIENT_ID = gql(`
  query GetVehiclesByClientId($clientId: Address!, $owner: Address, $first: Int, $last: Int, $before: String, $after: String) {
    vehicles(filterBy:{ privileged: $clientId, owner: $owner }, first: $first, last: $last, before:$before, after:$after) {
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
        aftermarketDevice { manufacturer { name } }
        syntheticDevice { connection { name } }
      }
    }
  }
`);

export const VEHICLE_FOR_LICENSE = gql(`
  query GetVehicleForLicense($tokenId: Int!, $clientId: Address!) {
    vehicle(tokenId: $tokenId) {
      tokenId
      tokenDID
      definition { make model year }
      aftermarketDevice { manufacturer { name } }
      syntheticDevice { connection { name } }
      sacd(grantee: $clientId) { permissions }
    }
  }
`);

export const VehicleDetailsTable: FC<IProps> = ({
  clientId,
  owner,
  tokenIdSearch = null,
  showSources = false,
  showLastSeen = false,
}) => {
  const router = useRouter();
  const { data, refetch, loading, error } = useQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, owner: owner || null, first: PAGE_SIZE },
    skip: tokenIdSearch !== null,
  });
  const single = useQuery(VEHICLE_FOR_LICENSE, {
    variables: { tokenId: tokenIdSearch ?? 0, clientId },
    skip: tokenIdSearch === null,
  });
  const [simulatedTokenIds, setSimulatedTokenIds] = useState<Set<number>>(new Set());
  const [renouncingVehicle, setRenouncingVehicle] = useState<VehicleRow | null>(null);
  const [removedTokenIds, setRemovedTokenIds] = useState<Set<number>>(new Set());
  const { renounce } = useRenounceVehiclePermissions();

  useEffect(() => {
    getSimulatedVehicles({ clientId }).then((vehicles) => {
      setSimulatedTokenIds(new Set(vehicles.map((v) => v.token_id)));
    });
  }, [clientId]);

  const handleRenounce = async () => {
    if (!renouncingVehicle) return;
    const { tokenId } = renouncingVehicle;
    try {
      await renounce(tokenId, clientId);
      // Optimistic removal
      setRemovedTokenIds((prev) => new Set([...prev, tokenId]));
      setRenouncingVehicle(null);
      toast.success('Access renounced');
      // Background sync
      if (tokenIdSearch !== null) single.refetch();
      else refetch();
    } catch (e: unknown) {
      Sentry.captureException(e);
      toast.error('Failed to renounce access');
      throw e; // let modal display the inline error
    }
  };

  if (tokenIdSearch !== null) {
    if (single.loading) return <Loader isLoading />;
    if (single.error) {
      return (
        <p className="text-body-sm text-negative">
          Couldn&apos;t look up vehicle {tokenIdSearch}: {single.error.message}
        </p>
      );
    }
    const v = single.data?.vehicle;
    if (!v) {
      return (
        <p className="text-body-sm text-muted">
          No vehicle has token ID {tokenIdSearch}.
        </p>
      );
    }
    if (!v.sacd) {
      return (
        <p className="text-body-sm text-muted">
          Vehicle {v.tokenId} ({v.definition?.make} {v.definition?.model}) isn&apos;t
          shared with this license.
        </p>
      );
    }
    return (
      <>
        <PaginatedTableIdentityAPI
          data={[v]}
          columns={buildColumns(simulatedTokenIds, () => setRenouncingVehicle(v), {
            showSources,
            showLastSeen,
            clientId,
          })}
          onPaginationChange={() => {}}
          rowCount={1}
          pageInfo={{}}
          pageSize={PAGE_SIZE}
          onRowClick={(row) =>
            router.push(`/vehicles/${row.tokenId}?license=${clientId}`)
          }
        />
        <RenounceVehicleModal
          vehicle={renouncingVehicle}
          onConfirm={handleRenounce}
          onClose={() => setRenouncingVehicle(null)}
        />
      </>
    );
  }
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
        columns={buildColumns(
          simulatedTokenIds,
          (tokenId) => {
            const node =
              data.vehicles.nodes.find((n: VehicleNode) => n.tokenId === tokenId) ?? null;
            setRenouncingVehicle(node);
          },
          { showSources, showLastSeen, clientId },
        )}
        onPaginationChange={refetch}
        rowCount={visibleCount}
        pageInfo={data.vehicles.pageInfo}
        pageSize={PAGE_SIZE}
        onRowClick={(row) => router.push(`/vehicles/${row.tokenId}?license=${clientId}`)}
      />
      <RenounceVehicleModal
        vehicle={renouncingVehicle}
        onConfirm={handleRenounce}
        onClose={() => setRenouncingVehicle(null)}
      />
    </>
  );
};
