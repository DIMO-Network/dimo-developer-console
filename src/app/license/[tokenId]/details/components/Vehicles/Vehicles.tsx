'use client';
import React, { FC } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';
import { VehicleSimulatorModal } from '@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal';
import './Vehicles.css';

export const DEVELOPER_LICENSE_VEHICLES_FRAGMENT = gql(`
  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
    clientId
    tokenId
  }
`);

export const GET_VEHICLE_COUNT_BY_CLIENT_ID = gql(`
  query GetVehicleCountByClientId($clientId:Address!) {
    vehicles(first:0, filterBy:{privileged:$clientId}) {
      totalCount
    }
  }
`);

interface IProps {
  license: FragmentType<typeof DEVELOPER_LICENSE_VEHICLES_FRAGMENT>;
}

export const Vehicles: FC<IProps> = ({ license }) => {
  const fragment = useFragment(DEVELOPER_LICENSE_VEHICLES_FRAGMENT, license);
  const { data, loading, error } = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID, {
    variables: { clientId: fragment.clientId },
  });
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="vehicles-stat">
        {loading && <Loader isLoading />}
        {!!error && <p className="text-sm text-text-secondary">Error loading vehicles</p>}
        {!!data && (
          <>
            <Link
              href={`/license/vehicles/${fragment.clientId}`}
              className="hover:opacity-80 transition-opacity"
            >
              <p className="vehicles-stat__number">{data.vehicles.totalCount}</p>
            </Link>
            <p className="vehicles-stat__label">Connected Vehicles</p>
            <Link
              href={`/license/vehicles/${fragment.clientId}`}
              className="vehicles-stat__link"
            >
              View vehicle list →
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-row gap-3">
        <Link href={`/license/vehicles/${fragment.clientId}`} className="flex-1">
          <Button className="dark w-full">Vehicle List</Button>
        </Link>
        <div className="flex-1">
          <VehicleSimulatorModal clientId={fragment.clientId as `0x${string}`} />
        </div>
        <Button
          className="dark flex-1"
          onClick={() => router.push(`/license/${fragment.tokenId}/configurator`)}
        >
          Configure Sharing
        </Button>
      </div>
    </div>
  );
};
