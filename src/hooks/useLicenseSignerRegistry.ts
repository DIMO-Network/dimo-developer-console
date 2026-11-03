'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTeam } from '@/hooks/useTeam';
import type { LicenseSignerRecord } from '@/types/team';
import { fetchApiResult } from '@/utils/fetchApiResult';
import { unwrap } from '@/utils/teamApiError';

// Who each key on a license is for (spec: key registry). Enabled rows only,
// by lowercase address: Identity checksums, console-api may not.
export const useLicenseSignerRegistry = (tokenId: number) => {
  const { activeTeam, isLoading } = useTeam();
  const query = useQuery({
    queryKey: ['license-signers', activeTeam?.id ?? null, tokenId],
    enabled: !isLoading && !!activeTeam,
    retry: false,
    queryFn: async () =>
      unwrap(
        await fetchApiResult<{ signers: LicenseSignerRecord[] }>(
          `/api/licenses/${tokenId}/signers`,
        ),
      ).signers,
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
