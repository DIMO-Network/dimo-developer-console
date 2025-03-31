import React, { FC } from 'react';
import { Title } from '@/components/Title';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';

import './Vehicles.css';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import Link from 'next/link';

export const DEVELOPER_LICENSE_VEHICLES_FRAGMENT = gql(`
  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
    clientId
  }
`);

const GET_VEHICLE_COUNT_BY_CLIENT_ID = gql(`
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

  return (
    <Section>
      <SectionHeader title={'Vehicles'} />
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
      <div className={'flex flex-row items-center gap-2.5 pb-4 md:pb-0'}>
        <Title className={'text-4xl'}>{totalCount}</Title>
        <p>Connected Vehicles</p>
      </div>
      <Link href={`/license/vehicles/${clientId}`}>
        <Button className={'table-action-button'}>Vehicle Details</Button>
      </Link>
    </div>
  );
};
