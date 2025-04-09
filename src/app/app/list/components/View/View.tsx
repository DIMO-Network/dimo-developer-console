'use client';
import { type FC } from 'react';

import { Loader } from '@//components/Loader';
import { Banner } from '@/app/app/list/components/Banner';
import { useGlobalAccount, useOnboarding, useUser } from '@/hooks';
import Image from 'next/image';
import { LicenseList } from '@/app/license/list';
import './View.css';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';

const GET_DEVELOPER_LICENSES_BY_OWNER = gql(`
  query GetDeveloperLicensesByOwner($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      ...TotalDeveloperLicenseCountFragment
      ...DeveloperLicenseSummariesOnConnection
    }
  }
`);

export const View: FC = () => {
  const { balance } = useOnboarding();
  const { user } = useUser();
  const { currentUser } = useGlobalAccount();
  const { data, error, loading } = useQuery(GET_DEVELOPER_LICENSES_BY_OWNER, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  console.log(user?.name);
  return (
    <div className="app-list-page">
      <div className="welcome-message">
        <Image
          src={'/images/waving_hand.svg'}
          width={16}
          height={16}
          alt={'waving-hand'}
        />
        <p className="title">Welcome, {user?.name.slice(0, user.name?.indexOf(' '))}</p>
      </div>
      {loading && <Loader isLoading={true} />}
      {!!error && <p>There was an error fetching your developer licenses</p>}
      {!!data?.developerLicenses && (
        <>
          <Banner balance={balance} licenseConnection={data.developerLicenses} />
          <LicenseList licenseConnection={data.developerLicenses} />
        </>
      )}
    </div>
  );
};

export default View;
