import {useQuery, QueryHookOptions} from "@apollo/client";
import {gql} from '@/gql';

export const DeveloperLicenseFragment = gql(`
  fragment DeveloperLicenseSummary on DeveloperLicense {
    owner
    tokenId
    alias
    clientId
  }
`);

const GetDeveloperLicenseByTokenIdQuery = gql(`
    query GetDeveloperLicenseByTokenId($tokenId: Int!) {
        developerLicense(by: { tokenId: $tokenId }) {
            ...DeveloperLicenseSummary
        }
    }
`);

export const useGetDeveloperLicenseByTokenId = (tokenId?: number, options: QueryHookOptions = {}) => {
  return useQuery(GetDeveloperLicenseByTokenIdQuery, {
    // @ts-expect-error query is skipped if no tokenId is undefined
    variables:{tokenId},
    skip: !tokenId,
    ...options
  });
};
