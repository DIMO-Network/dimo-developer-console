'use client';
import React, { FC } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';

import './Vehicles.css';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { TotalCount } from '@/components/TotalVehicleCount';
import { useRouter } from 'next/navigation';
import { VehicleSimulatorModal } from '@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal';

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
    <div className={'w-full'}>
      <Section>
        <SectionHeader title={'Vehicles'}>
          <div className={'flex flex-row gap-2'}>
            <VehicleSimulatorModal clientId={fragment.clientId as `0x${string}`} />
            <Button
              className="dark with-icon px-4"
              onClick={() => router.push(`/license/${fragment.tokenId}/configurator`)}
            >
              Configure Vehicle Sharing
            </Button>
          </div>
        </SectionHeader>
        <div className={'flex flex-col flex-1'}>
          {!!error && <p>We had trouble fetching the connected vehicles</p>}
          {loading && <Loader isLoading={true} />}
          {!!data && (
            <VehiclesTotalCount
              totalCount={data.vehicles.totalCount}
              clientId={fragment.clientId}
            />
          )}
        </div>
      </Section>
    </div>
  );
};

const VehiclesTotalCount = ({
  totalCount,
  clientId,
}: {
  totalCount: number;
  clientId: string;
}) => {
  return (
    <div className={'vehicle-count-container'}>
      <Link
        href={`/license/vehicles/${clientId}`}
        className="hover:opacity-80 transition-opacity cursor-pointer"
      >
        <TotalCount totalCount={totalCount} countedThings="Connected Vehicles" />
      </Link>
      <Link href={`/license/vehicles/${clientId}`}>
        <Button className={'table-action-button'}>Vehicle Details</Button>
      </Link>
    </div>
  );
};
