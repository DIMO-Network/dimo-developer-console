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
        {!!error && <p className="text-body-sm text-muted">Error loading vehicles</p>}
        {!!data && (
          <>
            <Link
              href={`/license/vehicles/${fragment.clientId}`}
              className="transition-opacity hover:opacity-80"
            >
              <p className="vehicles-stat__number">{data.vehicles.totalCount}</p>
            </Link>
            <p className="vehicles-stat__label">Connected vehicles</p>
            <Link
              href={`/license/vehicles/${fragment.clientId}`}
              className="vehicles-stat__link"
            >
              View vehicle list →
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/license/vehicles/${fragment.clientId}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Vehicle list
          </Button>
        </Link>
        <div className="flex-1 [&>button]:w-full">
          <VehicleSimulatorModal clientId={fragment.clientId as `0x${string}`} />
        </div>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => router.push(`/license/${fragment.tokenId}/configurator`)}
        >
          Configure sharing
        </Button>
      </div>
    </div>
  );
};
