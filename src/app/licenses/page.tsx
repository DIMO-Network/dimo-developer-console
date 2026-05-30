'use client';
import { Suspense, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useGlobalAccount } from '@/hooks';
import { Loader } from '@/components/Loader';
import { useRouter } from 'next/navigation';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';

const GET_FIRST_LICENSE = gql(`
  query GetFirstLicenseForRedirect($owner: Address!) {
    developerLicenses(first: 1, filterBy: { owner: $owner }) {
      nodes {
        tokenId
      }
    }
  }
`);

const LicensesView = () => {
  const { currentUser } = useGlobalAccount();
  const router = useRouter();
  const { data, loading } = useQuery(GET_FIRST_LICENSE, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });

  const firstTokenId = data?.developerLicenses?.nodes?.[0]?.tokenId;

  useEffect(() => {
    if (firstTokenId) {
      router.replace(`/license/${firstTokenId}/details`);
    }
  }, [firstTokenId, router]);

  if (loading || firstTokenId) {
    return <Loader isLoading={true} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 items-start p-2">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">No licenses yet</p>
        <p className="text-sm text-text-secondary">
          Create your first developer license to get started.
        </p>
      </div>
      <CreateAppButton />
    </div>
  );
};

const LicensesPage = () => (
  <Suspense>
    <LicensesView />
  </Suspense>
);

export default LicensesPage;
