import { gql } from '@/gql';
import { AllVehiclesQuery } from '@/gql/graphql';
import { useQuery } from '@apollo/client';
import { createColumnHelper } from '@tanstack/table-core';
import { useCallback, useState } from 'react';
import { PaginatedTable, Table } from '@/components/Table';

const ALL_VEHICLES = gql(`
  query AllVehicles($first: Int, $last: Int, $before: String, $after: String) {
    vehicles(first: $first, last: $last, before:$before, after:$after) {
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

type TData = AllVehiclesQuery['vehicles']['nodes'][0];
const columnHelper = createColumnHelper<TData>();
const columns = [
  columnHelper.accessor('tokenId', {
    header: 'Vehicle token ID',
  }),
  columnHelper.accessor('definition', {
    header: 'Vehicle MMY',
    cell: (info) => (
      <p>
        {info.getValue()?.make} {info.getValue()?.model} {info.getValue()?.year}
      </p>
    ),
  }),
];

interface Pagination {
  startCursor?: string | null;
  endCursor?: string | null;
}
export const ExampleVehicleTable = () => {
  const [pagination, setPagination] = useState<Pagination>({
    startCursor: null,
    endCursor: null,
  });
  const { data, refetch, loading } = useQuery(ALL_VEHICLES, {
    variables: { first: 10 },
  });
  const renderMMY = (item: TData) => {
    return (
      <p>
        {item.definition?.make} {item.definition?.model} {item.definition?.year}
      </p>
    );
  };
  const onNext = () => {
    if (!data?.vehicles.pageInfo.hasNextPage) return;
    console.log('next called with', data.vehicles.pageInfo.endCursor);
    refetch({
      after: data.vehicles.pageInfo.endCursor,
      first: 10,
      last: null,
      before: null,
    });
  };

  const onPrevious = () => {
    if (!data?.vehicles.pageInfo.hasPreviousPage) return;
    console.log('previous called with', data.vehicles.pageInfo.startCursor);
    refetch({
      before: data.vehicles.pageInfo.startCursor,
      last: 10,
      after: null,
      first: null,
    });
  };

  if (!data?.vehicles) {
    return null;
  }
  if (loading) {
    return null;
  }
  console.log('DATA', data.vehicles.pageInfo);
  return (
    <Table
      columns={[
        { name: 'tokenId', label: 'Vehicle token ID' },
        { name: 'definition', label: 'Vehicle MMY', render: renderMMY },
      ]}
      data={data.vehicles.nodes}
      pageInfo={data.vehicles.pageInfo}
      onNext={onNext}
      onPrevious={onPrevious}
      totalCount={data.vehicles.totalCount}
    />
  );
  // return (
  //   <PaginatedTable
  //     data={data.vehicles.nodes}
  //     columns={columns}
  //     pagination={pagination}
  //     onPaginationChange={setPagination}
  //     rowCount={data?.vehicles.totalCount}
  //   />
  // );
};
