'use client';

import { DocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useTeam } from '@/hooks/useTeam';
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
  const { ownerAddress } = useTeam();
  const hasAddress = !!ownerAddress;

  // Read past the fragment's masking: only the count is needed here.
  const { data, loading, error } = useQuery<{
    developerLicenses?: { totalCount?: number };
  }>(CHECK_HAS_DEVELOPER_LICENSES as DocumentNode, {
    variables: { owner: ownerAddress ?? '' },
    skip: !hasAddress,
  });

  return {
    hasDeveloperLicenses: (data?.developerLicenses?.totalCount ?? 0) > 0,
    loading: !hasAddress || loading,
    error,
  };
};
