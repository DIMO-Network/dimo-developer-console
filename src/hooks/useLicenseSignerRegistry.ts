'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listLicenseSigners } from '@/actions/teams';
import { useTeam } from '@/hooks/useTeam';
import type { LicenseSignerRecord } from '@/types/team';
import { unwrap } from '@/utils/teamApiError';

// Who each key on a license is for (spec: key registry). Enabled rows only,
// by lowercase address: Identity checksums, console-api may not.
export const useLicenseSignerRegistry = (tokenId: number) => {
  const { activeTeam, isLoading } = useTeam();
  const query = useQuery({
    queryKey: ['license-signers', activeTeam?.id ?? null, tokenId],
    enabled: !isLoading && !!activeTeam,
    retry: false,
    queryFn: async () => unwrap(await listLicenseSigners(tokenId)).signers,
  });
  const byAddress = useMemo(
    () =>
      new Map<string, LicenseSignerRecord>(
        (query.data ?? [])
          .filter((r) => !r.disabledAt)
          .map((r) => [r.signerAddress.toLowerCase(), r]),
      ),
    [query.data],
  );
  return {
    byAddress,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
