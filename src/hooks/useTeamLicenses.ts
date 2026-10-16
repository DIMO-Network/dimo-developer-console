'use client';
import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { DEVELOPER_LICENSES_FOR_WEBHOOKS } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useTeam } from '@/hooks/useTeam';
import type { DeveloperLicenseForWebhook } from '@/types/webhook';

export interface TeamLicense {
  tokenId: number;
  clientId: string;
  label: string;
  redirectUri: string | null;
  // Lowercase: Identity checksums, Turnkey and console-api may not.
  signers: string[];
}

const toTeamLicense = (node: DeveloperLicenseForWebhook): TeamLicense => ({
  tokenId: node.tokenId,
  clientId: node.clientId,
  label: node.alias || node.clientId,
  redirectUri: node.redirectURIs.nodes[0]?.uri ?? null,
  signers: node.signers.nodes.map((s) => String(s.address).toLowerCase()),
});

// Every license of the active team's owner, including ones without a redirect
// URI (a member may still hold a key there). Same query as
// useValidDeveloperLicenses, so one refetch updates both.
export const useTeamLicenses = () => {
  const { ownerAddress } = useTeam();
  const { data, loading, error, refetch } = useQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: ownerAddress ?? '' },
    skip: !ownerAddress,
  });
  const licenses = useMemo(
    () => (error ? [] : (data?.developerLicenses.nodes ?? []).map(toTeamLicense)),
    [data, error],
  );
  return { licenses, loading: loading || !ownerAddress, error, refetch };
};
