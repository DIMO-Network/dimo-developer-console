'use client';

import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { useTeam } from '@/hooks/useTeam';
import { gql } from '@/gql';
import type { TypedDocumentString } from '@/gql/graphql';

// Query to check if user has any developer licenses
export const CHECK_HAS_DEVELOPER_LICENSES = gql(`
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
  const { data, loading, error } = useIdentityQuery(
    CHECK_HAS_DEVELOPER_LICENSES as unknown as TypedDocumentString<
      { developerLicenses?: { totalCount?: number } },
      { owner: string }
    >,
    {
      variables: { owner: ownerAddress ?? '' },
      skip: !hasAddress,
    },
  );

  // null means unknown: no owner yet, still loading, a failed query or no data.
  // A failed request leaves data undefined, which must not read as "no licenses".
  const count = data?.developerLicenses?.totalCount;
  const answered = hasAddress && !loading && !error && typeof count === 'number';

  return {
    hasDeveloperLicenses: answered ? count > 0 : null,
    loading: !hasAddress || loading,
    error,
  };
};
