'use client';

import { FragmentType, gql, useFragment } from '@/gql';
import { DeveloperLicenseVehicleDetailsNodesFragmentFragment } from '@/gql/graphql';
import { FC, useState } from 'react';
import { Table, PaginatedTable } from '@/components/Table';
import { createColumnHelper } from '@tanstack/table-core';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

const DEVELOPER_LICENSE_VEHICLE_DETAILS_NODES_FRAGMENT = gql(`
  fragment DeveloperLicenseVehicleDetailsNodesFragment on VehicleConnection {
    totalCount
    nodes {
      tokenId
      definition {
        make
        model
        year
      }
    }
  }
`);

interface IProps {
  vehicleConnection: FragmentType<
    typeof DEVELOPER_LICENSE_VEHICLE_DETAILS_NODES_FRAGMENT
  >;
}

type VehicleNode = DeveloperLicenseVehicleDetailsNodesFragmentFragment['nodes'][0];
const columnHelper = createColumnHelper<VehicleNode>();
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
export const VehicleDetailsTable: FC<IProps> = ({ vehicleConnection }) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const fragment = useFragment(
    DEVELOPER_LICENSE_VEHICLE_DETAILS_NODES_FRAGMENT,
    vehicleConnection,
  );
  const [data] = useState([...fragment.nodes]);
  const renderMMY = (item: VehicleNode) => {
    const { definition } = item;
    return (
      <p>
        {definition?.make} {definition?.model} {definition?.year}
      </p>
    );
  };
  return (
    <>
      <PaginatedTable
        data={data}
        columns={columns}
        pagination={pagination}
        onPaginationChange={setPagination}
        rowCount={fragment.totalCount}
      />
      <Table
        columns={[
          { label: 'Vehicle token ID', name: 'tokenId' },
          { label: 'Vehicle MMY', name: '', render: renderMMY },
        ]}
        data={fragment.nodes ?? []}
      />
    </>
  );
  // return (
  //   <Table
  //     columns={[
  //       { label: 'Vehicle token ID', name: 'tokenId' },
  //       { label: 'Vehicle MMY', name: '', render: renderMMY },
  //     ]}
  //     data={fragment.nodes ?? []}
  //   />
  // );
};
