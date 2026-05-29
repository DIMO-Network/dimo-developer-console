'use client';
import { Suspense } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { useGlobalAccount, useOnboarding } from '@/hooks';
import { Loader } from '@/components/Loader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { LicenseList } from '@/app/license/list';

const GET_DEVELOPER_LICENSES = gql(`
  query GetDeveloperLicensesForLicensesPage($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      ...TotalDeveloperLicenseCountFragment
      ...DeveloperLicenseSummariesOnConnection
    }
  }
`);

const LicensesView = () => {
  const { balance, isLoading: loadingBalance } = useOnboarding();
  const { currentUser } = useGlobalAccount();
  const { data, error, loading } = useQuery(GET_DEVELOPER_LICENSES, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      {loading && <Loader isLoading={true} />}
      {!!error && <p>There was an error fetching your developer licenses</p>}
      {!!data?.developerLicenses && (
        <>
          <OnboardingBanner
            balance={balance}
            isLoading={loadingBalance}
            licenseConnection={data.developerLicenses}
          />
          <LicenseList licenseConnection={data.developerLicenses} />
        </>
      )}
    </div>
  );
};

const LicensesPage = () => (
  <Suspense>
    <LicensesView />
  </Suspense>
);

export default LicensesPage;
