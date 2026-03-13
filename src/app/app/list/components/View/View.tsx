'use client';
import { type FC } from 'react';

import { Loader } from '@/components/Loader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { useGlobalAccount, useOnboarding, useUser } from '@/hooks';
import Image from 'next/image';
import { LicenseList, GET_LICENSE_SUMMARIES } from '@/app/license/list';
import './View.css';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import { AppListRightPanel } from '@/app/app/list/components/RightPanel';
import { VehicleSimulator } from '@/app/app/list/components/VehicleSimulator';

const GET_DEVELOPER_LICENSES_BY_OWNER = gql(`
  query GetDeveloperLicensesByOwner($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      ...TotalDeveloperLicenseCountFragment
      ...DeveloperLicenseSummariesOnConnection      
    }
  }
`);

function getFirstName(name: string) {
  const trimmed = name.trim();
  const [firstName] = trimmed.split(' ');
  return firstName || '';
}

/**
 * Wrapper that unwraps fragment data and passes clientId to VehicleSimulator.
 */
const VehicleSimulatorSection: FC<{
  licenseConnection: FragmentType<typeof GET_LICENSE_SUMMARIES>;
}> = ({ licenseConnection }) => {
  const { nodes } = useFragment(GET_LICENSE_SUMMARIES, licenseConnection);
  // nodes[0] carries DeveloperLicenseSummaryFragment data inline via fragment masking.
  // Cast through unknown to access clientId without a second useFragment call.
  const firstNode = nodes[0] as { clientId?: `0x${string}` } | undefined;
  if (!firstNode?.clientId) return null;
  return <VehicleSimulator clientId={firstNode.clientId} />;
};

export const View: FC = () => {
  const { balance, isLoading: loadingBalance } = useOnboarding();
  const { data: user, isLoading: loadingUser } = useUser();
  const { currentUser } = useGlobalAccount();
  const {
    data,
    error,
    loading: loadingDevLicenses,
  } = useQuery(GET_DEVELOPER_LICENSES_BY_OWNER, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  const userFirstName = getFirstName(user?.name ?? '');

  return (
    <div className={'flex flex-1 flex-row'}>
      <div className="app-list-page">
        <div className="welcome-message">
          {loadingUser ? (
            <BubbleLoader isLoading isSmall />
          ) : (
            <>
              <Image
                src={'/images/waving_hand.svg'}
                width={16}
                height={16}
                alt={'waving-hand'}
              />
              <p className="title">Welcome{userFirstName ? `, ${userFirstName}` : '!'}</p>
            </>
          )}
        </div>

        {loadingBalance && loadingDevLicenses && <Loader isLoading={true} />}
        {!!error && <p>There was an error fetching your developer licenses</p>}
        {!!data?.developerLicenses && (
          <>
            <OnboardingBanner
              balance={balance}
              isLoading={loadingBalance}
              licenseConnection={data.developerLicenses}
            />
            <LicenseList licenseConnection={data.developerLicenses} />
            <VehicleSimulatorSection licenseConnection={data.developerLicenses} />
          </>
        )}
      </div>
      <AppListRightPanel />
    </div>
  );
};

export default View;
