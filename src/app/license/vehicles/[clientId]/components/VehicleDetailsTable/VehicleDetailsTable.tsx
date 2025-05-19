'use client';
import { FC } from 'react';
import { PaginatedTableIdentityAPI } from '@/components/Table';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { Loader } from '@/components/Loader';
import {
  columns,
  PAGE_SIZE,
} from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';

interface IProps {
  clientId: string;
}

const VEHICLES_BY_CLIENT_ID = gql(`
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
      columns={columns}
      onPaginationChange={refetch}
      rowCount={data.vehicles.totalCount}
      pageInfo={data.vehicles.pageInfo}
      pageSize={PAGE_SIZE}
    />
  );
};
