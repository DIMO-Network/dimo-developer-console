'use client';

import { useQuery, DocumentNode } from '@apollo/client';
import { useGlobalAccount } from '@/hooks';
import { gql } from '@/gql';

// Query to check if user has any developer licenses
const CHECK_HAS_DEVELOPER_LICENSES = gql(`
  query CheckHasDeveloperLicenses($owner: Address!) {
    developerLicenses(first: 1, filterBy: { owner: $owner }) {
      ...TotalDeveloperLicenseCountFragment
    }
  }
`);

export const useHasDeveloperLicenses = () => {
  const { currentUser } = useGlobalAccount();

  const { data, loading, error } = useQuery(
    CHECK_HAS_DEVELOPER_LICENSES as DocumentNode,
    {
      variables: { owner: currentUser?.smartContractAddress ?? '' },
      skip: !currentUser?.smartContractAddress,
    },
  );

  return {
    hasDeveloperLicenses: (data?.developerLicenses?.totalCount ?? 0) > 0,
    loading,
    error,
  };
};
