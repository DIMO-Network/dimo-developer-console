'use client';
import { FC, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { PaginatedTableIdentityAPI } from '@/components/Table';
import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { useQuery as useRestQuery } from '@tanstack/react-query';
import { gql } from '@/gql';
import { Loader } from '@/components/Loader';
import {
  buildColumns,
  PAGE_SIZE,
  type VehicleRow,
} from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';
import { RenounceVehicleModal } from '@/app/license/vehicles/[clientId]/components/RenounceVehicleModal';
import type { SimulatedVehicle } from '@/actions/simulatedVehicles';
import { fetchJson } from '@/utils/fetchJson';
import { useRenounceVehiclePermissions } from '@/hooks/useRenounceVehiclePermissions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';
import { useTeam } from '@/hooks/useTeam';

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
  const t = useTranslations('license');
  const { isOwner } = useTeam();
  const { data, refetch, loading, error } = useIdentityQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, owner: owner || null, first: PAGE_SIZE },
    skip: tokenIdSearch !== null,
  });
  const single = useIdentityQuery(VEHICLE_FOR_LICENSE, {
    variables: { tokenId: tokenIdSearch ?? 0, clientId },
    skip: tokenIdSearch === null,
  });
  const [renouncingVehicle, setRenouncingVehicle] = useState<VehicleRow | null>(null);
  const [removedTokenIds, setRemovedTokenIds] = useState<Set<number>>(new Set());
  const { renounce } = useRenounceVehiclePermissions();

  const { data: simulatedVehicles } = useRestQuery({
    queryKey: ['simulated-vehicles', clientId],
    queryFn: () =>
      fetchJson<SimulatedVehicle[]>(
        `/api/simulated-vehicles?clientId=${encodeURIComponent(clientId)}`,
      ),
  });
  const simulatedTokenIds = useMemo(
    () => new Set((simulatedVehicles ?? []).map((v) => v.token_id)),
    [simulatedVehicles],
  );

  const handleRenounce = async () => {
    if (!renouncingVehicle) return;
    const { tokenId } = renouncingVehicle;
    try {
      await renounce(tokenId, clientId);
      // Optimistic removal
      setRemovedTokenIds((prev) => new Set([...prev, tokenId]));
      setRenouncingVehicle(null);
      toast.success(t('vehicleTable.renounced'));
      // Background sync
      if (tokenIdSearch !== null) single.refetch();
      else refetch();
    } catch (e: unknown) {
      Sentry.captureException(e);
      toast.error(t('vehicleTable.renounceFailed'));
      throw e; // let modal display the inline error
    }
  };

  if (tokenIdSearch !== null) {
    if (single.loading) return <Loader isLoading />;
    if (single.error) {
      return (
        <p className="text-body-sm text-negative">
          {t('vehicleTable.lookupFailed', {
            tokenId: tokenIdSearch,
            message: single.error.message,
          })}
        </p>
      );
    }
    const v = single.data?.vehicle;
    if (!v) {
      return (
        <p className="text-body-sm text-muted">
          {t('vehicleTable.noVehicle', { tokenId: tokenIdSearch })}
        </p>
      );
    }
    if (!v.sacd) {
      return (
        <p className="text-body-sm text-muted">
          {t('vehicleTable.notShared', {
            tokenId: v.tokenId,
            make: v.definition?.make ?? '',
            model: v.definition?.model ?? '',
          })}
        </p>
      );
    }
    return (
      <>
        <PaginatedTableIdentityAPI
          label={t('vehicleTable.label')}
          data={[v]}
          columns={buildColumns(simulatedTokenIds, () => setRenouncingVehicle(v), {
            showSources,
            showLastSeen,
            clientId,
            canRenounce: isOwner,
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
    return <p>{t('vehicleTable.error', { message: error.message })}</p>;
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
        label={t('vehicleTable.label')}
        data={visibleNodes}
        columns={buildColumns(
          simulatedTokenIds,
          (tokenId) => {
            const node =
              data.vehicles.nodes.find((n: VehicleNode) => n.tokenId === tokenId) ?? null;
            setRenouncingVehicle(node);
          },
          { showSources, showLastSeen, clientId, canRenounce: isOwner },
        )}
        onPaginationChange={(page) =>
          refetch(page).catch((error: unknown) => {
            toast.error(t('vehicleTable.pageLoadFailed'));
            throw error;
          })
        }
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
