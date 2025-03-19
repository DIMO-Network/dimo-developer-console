import {gql, useQuery, QueryHookOptions} from "@apollo/client";

const GetDeveloperLicenseByTokenIdQuery = gql`
    query GetDeveloperLicenseByTokenId($tokenId: Int!) {
        developerLicense(by: { tokenId: $tokenId }) {
            owner
            tokenId
            alias
            clientId
            signers(first: 100) {
                nodes {
                    address
                    enabledAt
                }
            }
            redirectURIs(first: 100) {
                totalCount
                nodes {
                    uri
                }
            }
        }
    }
`;

export const useGetDeveloperLicenseByTokenId = (tokenId?: number, options: QueryHookOptions = {}) => {
  return useQuery(GetDeveloperLicenseByTokenIdQuery, {variables:{tokenId}, ...options});
};
