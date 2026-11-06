import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { DeveloperLicenseForWebhook, LocalDeveloperLicense } from '@/types/webhook';
import { gql } from '@/gql';
import { useTeam } from '@/hooks/useTeam';

export const DEVELOPER_LICENSES_FOR_WEBHOOKS = gql(`
  query GetDeveloperLicensesForWebhooks($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      nodes {
        alias
        clientId
        tokenId
        owner
        redirectURIs(first:100) {
          nodes {
            uri
          }
        }
        signers(first:100) {
          nodes {
            address
          }
        }
      }
    }
  }
`);

// The active team's licenses (its owner's wallet), usable for a developer JWT.
export const useValidDeveloperLicenses = () => {
  const { ownerAddress } = useTeam();
  const { data, loading, ...rest } = useIdentityQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: ownerAddress ?? '' },
    skip: !ownerAddress,
  });

  const isValid = (devLicense: DeveloperLicenseForWebhook) => {
    return !!(devLicense.clientId && devLicense.redirectURIs.nodes.length);
  };

  const convertLicense = (devLicense: DeveloperLicenseForWebhook) => {
    return new LocalDeveloperLicense(devLicense);
  };
  const licenses = data?.developerLicenses.nodes ?? [];
  return {
    developerLicenses: licenses.filter(isValid).map(convertLicense),
    // A new license has no redirect URI, and without one no developer JWT.
    hasLicenseWithoutRedirectUri: licenses.some((license) => !isValid(license)),
    // A skipped query is "not loading"; until the team owner is known it is.
    loading: loading || !ownerAddress,
    ...rest,
  };
};
