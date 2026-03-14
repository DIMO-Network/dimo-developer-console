'use client';

import { Section, SectionHeader } from '@/components/Section';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';
import { use } from 'react';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Title } from '@/components/Title';
import configuration from '@/config';
import { MAKES } from '@/app/app/list/components/VehicleSimulator/constants';

const IS_TESTNET = configuration.CONTRACT_NETWORK === BigInt(80_002);
const SIMULATOR_MAKE_LABELS = new Set(MAKES.map((m) => m.label));

const DEVELOPER_LICENSE_VEHICLE_DETAILS = gql(`
  query DeveloperLicenseVehiclesQuery($clientId: Address!) {
    vehicles(first: 0, filterBy: { privileged: $clientId }) {
      totalCount
    }
  }
`);

const SIMULATOR_VEHICLE_DEFS = gql(`
  query SimulatorVehicleDefs($clientId: Address!) {
    vehicles(first: 1000, filterBy: { privileged: $clientId }) {
      nodes {
        definition {
          make
        }
      }
    }
  }
`);

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const { data } = useQuery(DEVELOPER_LICENSE_VEHICLE_DETAILS, {
    variables: { clientId },
  });
  const { data: defsData } = useQuery(SIMULATOR_VEHICLE_DEFS, {
    variables: { clientId },
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
      <Section>
        <div className={'flex flex-row items-center gap-2.5 pb-4 md:pb-0'}>
          <Title className={'text-4xl'}>{totalCount}</Title>
          <p className={'text-text-secondary text-xl'}>
            Connected Vehicles
            {testVehicleCount > 0 && (
              <span className={'text-sm ml-1.5'}>
                ({testVehicleCount} Test Vehicle{testVehicleCount !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
      </Section>
      <Section>
        <SectionHeader title={'Vehicle Details'} />
        <VehicleDetailsTable clientId={clientId} />
      </Section>
    </div>
  );
};
