import { gql } from '@/gql';

export const VEHICLE_DETAIL = gql(`
  query GetVehicleDetail($tokenId: Int!) {
    vehicle(tokenId: $tokenId) {
      tokenId
      tokenDID
      owner
      mintedAt
      imageURI
      definition { id make model year }
      aftermarketDevice {
        tokenId
        tokenDID
        address
        serial
        pairedAt
        mintedAt
        manufacturer { name }
      }
      syntheticDevice {
        tokenId
        tokenDID
        address
        mintedAt
        connection { name address }
      }
      sacds(first: 100) {
        nodes { grantee permissions createdAt expiresAt source }
      }
      privileges(first: 50) {
        nodes { id user setAt expiresAt }
      }
    }
  }
`);

export const LICENSE_ALIAS = gql(`
  query GetDeveloperLicenseAlias($clientId: Address!) {
    developerLicense(by: { clientId: $clientId }) {
      alias
      clientId
    }
  }
`);
