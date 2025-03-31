'use client';

import { FragmentType, gql, useFragment } from '@/gql';
import { DeveloperLicenseVehicleDetailsNodesFragmentFragment } from '@/gql/graphql';
import { FC } from 'react';
import { Table } from '@/components/Table';

const DEVELOPER_LICENSE_VEHICLE_DETAILS_NODES_FRAGMENT = gql(`
  fragment DeveloperLicenseVehicleDetailsNodesFragment on VehicleConnection {
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

export const VehicleDetailsTable: FC<IProps> = ({ vehicleConnection }) => {
  const fragment = useFragment(
    DEVELOPER_LICENSE_VEHICLE_DETAILS_NODES_FRAGMENT,
    vehicleConnection,
  );
  const renderMMY = (item: VehicleNode) => {
    const { definition } = item;
    return (
      <p>
        {definition?.make} {definition?.model} {definition?.year}
      </p>
    );
  };
  return (
    <Table
      columns={[
        { label: 'Vehicle token ID', name: 'tokenId' },
        { label: 'Vehicle MMY', name: '', render: renderMMY },
      ]}
      data={fragment.nodes ?? []}
    />
  );
};
