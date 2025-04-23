'use client';
import { type FC } from 'react';

import { Loader } from '@/components/Loader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { useGlobalAccount, useOnboarding, useUser } from '@/hooks';
import Image from 'next/image';
import { LicenseList } from '@/app/license/list';
import './View.css';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import { AppListRightPanel } from '@/app/app/list/components/RightPanel';

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

export const View: FC = () => {
  const { balance } = useOnboarding();
  const { data: user, isLoading } = useUser();
  const { currentUser } = useGlobalAccount();
  const { data, error, loading } = useQuery(GET_DEVELOPER_LICENSES_BY_OWNER, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  const userFirstName = getFirstName(user?.name ?? '');
  return (
    <div className={'flex flex-1 flex-row'}>
      <div className="app-list-page">
        <div className="welcome-message">
          {isLoading ? (
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

        {loading && <Loader isLoading={true} />}
        {!!error && <p>There was an error fetching your developer licenses</p>}
        {!!data?.developerLicenses && (
          <>
            <OnboardingBanner
              balance={balance}
              licenseConnection={data.developerLicenses}
            />
            <LicenseList licenseConnection={data.developerLicenses} />
          </>
        )}
      </div>
      <AppListRightPanel />
    </div>
  );
};

export default View;
