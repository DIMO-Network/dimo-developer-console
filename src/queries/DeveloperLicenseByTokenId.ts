import {gql} from "@/gql";

export const DeveloperLicenseSummaryFragment = gql(`
  fragment DeveloperLicenseSummary on DeveloperLicense {
    owner
    tokenId
    alias
    clientId
  }
`);

export const DeveloperLicenseByTokenIdDocument = gql(`
    query DeveloperLicenseByTokenId($tokenId: Int!) {
        developerLicense(by: { tokenId: $tokenId }) {
            ...DeveloperLicenseSummary
        }
    }
`);
