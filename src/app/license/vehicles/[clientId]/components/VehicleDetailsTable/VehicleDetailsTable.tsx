'use client';
import { FC, useEffect, useState } from 'react';
import { PaginatedTableIdentityAPI } from '@/components/Table';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { Loader } from '@/components/Loader';
import {
  buildColumns,
  PAGE_SIZE,
} from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';
import { getSimulatedVehicles } from '@/actions/simulatedVehicles';

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
  const { data, refetch, loading, error } = useQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, first: PAGE_SIZE },
  });
  const [simulatedTokenIds, setSimulatedTokenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getSimulatedVehicles({ clientId }).then((vehicles) => {
      setSimulatedTokenIds(new Set(vehicles.map((v) => v.token_id)));
    });
  }, [clientId]);

  if (error) {
    return <p>Error: {error.message}</p>;
  }
  if (loading) {
    return <Loader isLoading />;
  }
  if (!data) {
    return null;
  }
  return (
    <PaginatedTableIdentityAPI
      data={data.vehicles.nodes}
      columns={buildColumns(simulatedTokenIds)}
      onPaginationChange={refetch}
      rowCount={data.vehicles.totalCount}
      pageInfo={data.vehicles.pageInfo}
      pageSize={PAGE_SIZE}
    />
  );
};
