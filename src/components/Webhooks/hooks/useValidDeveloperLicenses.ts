import { useGlobalAccount } from '@/hooks';
import { useQuery } from '@apollo/client';
import { DeveloperLicenseForWebhook, LocalDeveloperLicense } from '@/types/webhook';
import { gql } from '@/gql';

export const DEVELOPER_LICENSES_FOR_WEBHOOKS = gql(`
  query GetDeveloperLicensesForWebhooks($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      nodes {
        alias
        clientId
        redirectURIs(first:100) {
          nodes {
            uri
          }
        }
      }
    }
  }
`);

export const useValidDeveloperLicenses = () => {
  const { currentUser } = useGlobalAccount();
  const { data } = useQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });

  const isValid = (devLicense: DeveloperLicenseForWebhook) => {
    return !!(devLicense.clientId && devLicense.redirectURIs.nodes.length);
  };

  const convertLicense = (devLicense: DeveloperLicenseForWebhook) => {
    return new LocalDeveloperLicense(devLicense);
  };
  return {
    developerLicenses:
      data?.developerLicenses.nodes.filter(isValid).map(convertLicense) ?? [],
  };
};
