'use client';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';
import { FC, useState } from 'react';
import { PaginatedTable } from '@/components/Table';
import {
  createColumnHelper,
  ColumnDef,
  OnChangeFn,
  PaginationState,
} from '@tanstack/table-core';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { Loader } from '@/components/Loader';

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

type VehicleNode = GetVehiclesByClientIdQuery['vehicles']['nodes'][0];
const columnHelper = createColumnHelper<VehicleNode>();
const columns: ColumnDef<VehicleNode>[] = [
  // @ts-expect-error multiple properties are improperly typed, but not sure how to fix it
  columnHelper.accessor('tokenId', {
    header: 'Vehicle token ID',
  }),
  columnHelper.display({
    id: 'vehicleMMY', // Unique ID since we're not directly accessing a property
    header: 'Vehicle MMY',
    cell: (info) => {
      const definition = info.row.original.definition;
      return (
        <p>
          {definition?.make} {definition?.model} {definition?.year}
        </p>
      );
    },
  }),
];
export const VehicleDetailsTable: FC<IProps> = ({ clientId }) => {
  const { data, refetch, loading, error } = useQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, first: 10 },
  });
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    if (newPagination.pageIndex > pagination.pageIndex) {
      refetch({
        after: data?.vehicles.pageInfo.endCursor,
        first: 10,
        last: null,
        before: null,
      });
    } else if (newPagination.pageIndex < pagination.pageIndex) {
      refetch({
        before: data?.vehicles.pageInfo.startCursor,
        last: 10,
        after: null,
        first: null,
      });
    }
    setPagination(newPagination);
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
  return (
    <PaginatedTable
      data={data.vehicles.nodes}
      columns={columns}
      pagination={pagination}
      onPaginationChange={handlePaginationChange}
      rowCount={data.vehicles.totalCount}
    />
  );
};
