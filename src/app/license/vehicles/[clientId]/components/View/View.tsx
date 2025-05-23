'use client';

import { Section, SectionHeader } from '@/components/Section';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';
import { use } from 'react';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { TotalVehicleCount } from '@/components/TotalVehicleCount';

const DEVELOPER_LICENSE_VEHICLE_DETAILS = gql(`
  query DeveloperLicenseVehiclesQuery($clientId: Address!) {
    vehicles(first: 0, filterBy: { privileged: $clientId }) {
      totalCount
    }
  }
`);

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const { data } = useQuery(DEVELOPER_LICENSE_VEHICLE_DETAILS, {
    variables: { clientId },
  });
  return (
    <div className={'flex flex-col gap-6'}>
      <Section>
        <TotalVehicleCount totalCount={data?.vehicles.totalCount ?? 0} />
      </Section>
      <Section>
        <SectionHeader title={'Vehicle Details'} />
        <VehicleDetailsTable clientId={clientId} />
      </Section>
    </div>
  );
};
