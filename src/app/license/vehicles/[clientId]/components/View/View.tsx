'use client';

import { Section, SectionHeader } from '@/components/Section';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';
import { use } from 'react';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Title } from '@/components/Title';
import configuration from '@/config';
import Link from 'next/link';
import { MAKES } from '@/app/app/list/components/VehicleSimulator/constants';
import { VEHICLES_BY_CLIENT_ID } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';

const IS_TESTNET = configuration.CONTRACT_NETWORK === BigInt(80_002);
const SIMULATOR_MAKE_LABELS = new Set(MAKES.map((m) => m.label));

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
  const { data: defsData } = useQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, first: 1000 },
    skip: !IS_TESTNET,
  });

  const totalCount = data?.vehicles.totalCount ?? 0;
  const testVehicleCount = IS_TESTNET
    ? (defsData?.vehicles.nodes.filter(
        (v) => v.definition?.make && SIMULATOR_MAKE_LABELS.has(v.definition.make),
      ).length ?? 0)
    : 0;

  return (
    <div className={'flex flex-col gap-6'}>
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link href="/licenses" className="transition-colors hover:text-ink">
          Licenses
        </Link>
        <span>/</span>
        <span className="text-ink">Vehicles</span>
      </nav>
      <Section>
        <div className={'flex flex-row items-center gap-2.5 pb-4 md:pb-0'}>
          <Title className={'text-metric'}>{totalCount}</Title>
          <p className={'text-card-title font-normal text-muted'}>
            Connected vehicles
            {testVehicleCount > 0 && (
              <span className={'ml-1.5 text-body-sm'}>
                ({testVehicleCount} test vehicle{testVehicleCount !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
      </Section>
      <Section>
        <SectionHeader title={'Vehicle details'} />
        <VehicleDetailsTable clientId={clientId} />
      </Section>
    </div>
  );
};
