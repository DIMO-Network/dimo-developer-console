import React, { FC, useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';

import './Vehicles.css';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { TotalCount } from '@/components/TotalVehicleCount';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { getConfigurationByClientId } from '@/actions/configurations';
import { VehicleSimulatorModal } from '@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal';
import configuration from '@/config';

// Only available on testnet (Polygon Amoy = 80002)
const IS_TESTNET = configuration.CONTRACT_NETWORK === BigInt(80_002);

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
  const [configurationId, setConfigurationId] = useState<string>('');
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!fragment.clientId) return;

    const getConfigurationId = async (clientId: string) => {
      try {
        const { id } = await getConfigurationByClientId({ client_id: clientId });
        setConfigurationId(id);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          return;
        }
        console.error(error);
      } finally {
        setReady(true);
      }
    };

    void getConfigurationId(fragment.clientId);
  }, [fragment.clientId]);

  return (
    <div className={'w-full'}>
      <Section>
        <SectionHeader title={'Vehicles'}>
          {IS_TESTNET && (
            <VehicleSimulatorModal clientId={fragment.clientId as `0x${string}`} />
          )}
          {ready && (
            <Button
              className="dark with-icon px-4"
              onClick={() => {
                router.push(
                  `/license/${fragment.tokenId}/configurator/${configurationId}`,
                );
              }}
            >
              Configure Vehicle Sharing
            </Button>
          )}
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
      <TotalCount totalCount={totalCount} countedThings="Connected Vehicles" />
      <Link href={`/license/vehicles/${clientId}`}>
        <Button className={'table-action-button'}>Vehicle Details</Button>
      </Link>
    </div>
  );
};
