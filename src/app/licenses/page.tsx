'use client';
import { Suspense } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { useGlobalAccount } from '@/hooks';
import { Loader } from '@/components/Loader';
import { LicenseList } from '@/app/license/list';

const GET_ALL_LICENSES = gql(`
  query GetAllLicensesForList($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      ...DeveloperLicenseSummariesOnConnection
    }
  }
`);

const LicensesView = () => {
  const { currentUser } = useGlobalAccount();
  const { data, loading } = useQuery(GET_ALL_LICENSES, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });

  if (loading || !currentUser || !data) {
    return <Loader isLoading={true} />;
  }

  return <LicenseList licenseConnection={data.developerLicenses} />;
};

const LicensesPage = () => (
  <Suspense>
    <LicensesView />
  </Suspense>
);

export default LicensesPage;
