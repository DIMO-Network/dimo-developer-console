/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type UserConfigurationFragmentFragment = { tokenId: number, clientId: any, owner: any, redirectURIs: { nodes: Array<{ uri: string }> } } & { ' $fragmentName'?: 'UserConfigurationFragmentFragment' };

export type DeveloperLicenseInfoQueryVariables = Exact<{
  tokenId: number;
}>;


export type DeveloperLicenseInfoQuery = { developerLicense: { ' $fragmentRefs'?: { 'DeveloperLicenseSummaryFragmentFragment': DeveloperLicenseSummaryFragmentFragment;'SignerFragmentFragment': SignerFragmentFragment;'RedirectUriFragmentFragment': RedirectUriFragmentFragment;'DeveloperLicenseVehiclesFragmentFragment': DeveloperLicenseVehiclesFragmentFragment;'DeveloperJwtsFragmentFragment': DeveloperJwtsFragmentFragment;'UserConfigurationFragmentFragment': UserConfigurationFragmentFragment } } | null };

export type BrandFragmentFragment = { alias: string | null, owner: any, tokenId: number, clientId: any } & { ' $fragmentName'?: 'BrandFragmentFragment' };

export type DeveloperJwtsFragmentFragment = { owner: any, clientId: any, redirectURIs: { nodes: Array<{ uri: string }> } } & { ' $fragmentName'?: 'DeveloperJwtsFragmentFragment' };

export type RedirectUriFragmentFragment = { owner: any, tokenId: number, redirectURIs: { nodes: Array<{ uri: string }> } } & { ' $fragmentName'?: 'RedirectUriFragmentFragment' };

export type SignerFragmentFragment = { owner: any, clientId: any, tokenId: number, signers: { nodes: Array<{ address: any, enabledAt: any }> }, redirectURIs: { nodes: Array<{ uri: string }> } } & { ' $fragmentName'?: 'SignerFragmentFragment' };

export type DeveloperLicenseVehiclesFragmentFragment = { clientId: any, tokenId: number, owner: any } & { ' $fragmentName'?: 'DeveloperLicenseVehiclesFragmentFragment' };

export type GetVehicleCountByClientIdQueryVariables = Exact<{
  clientId: any;
}>;


export type GetVehicleCountByClientIdQuery = { vehicles: { totalCount: number } };

export type GetDeveloperLicenseQueryVariables = Exact<{
  tokenId: number;
}>;


export type GetDeveloperLicenseQuery = { developerLicense: { ' $fragmentRefs'?: { 'DeveloperLicenseSummaryFragmentFragment': DeveloperLicenseSummaryFragmentFragment;'SignerFragmentFragment': SignerFragmentFragment;'RedirectUriFragmentFragment': RedirectUriFragmentFragment;'DeveloperLicenseVehiclesFragmentFragment': DeveloperLicenseVehiclesFragmentFragment;'DeveloperJwtsFragmentFragment': DeveloperJwtsFragmentFragment;'BrandFragmentFragment': BrandFragmentFragment } } | null };

export type DeveloperLicenseSummariesOnConnectionFragment = { nodes: Array<{ ' $fragmentRefs'?: { 'DeveloperLicenseSummaryFragmentFragment': DeveloperLicenseSummaryFragmentFragment } }> } & { ' $fragmentName'?: 'DeveloperLicenseSummariesOnConnectionFragment' };

export type GetVehiclesByClientIdQueryVariables = Exact<{
  clientId: any;
  owner?: any;
  first?: number | null | undefined;
  last?: number | null | undefined;
  before?: string | null | undefined;
  after?: string | null | undefined;
}>;


export type GetVehiclesByClientIdQuery = { vehicles: { totalCount: number, pageInfo: { startCursor: string | null, endCursor: string | null, hasNextPage: boolean, hasPreviousPage: boolean }, nodes: Array<{ tokenId: number, tokenDID: string, definition: { make: string | null, model: string | null, year: number | null } | null, aftermarketDevice: { manufacturer: { name: string } } | null, syntheticDevice: { connection: { name: string } } | null }> } };

export type GetVehicleForLicenseQueryVariables = Exact<{
  tokenId: number;
  clientId: any;
}>;


export type GetVehicleForLicenseQuery = { vehicle: { tokenId: number, tokenDID: string, definition: { make: string | null, model: string | null, year: number | null } | null, aftermarketDevice: { manufacturer: { name: string } } | null, syntheticDevice: { connection: { name: string } } | null, sacd: { permissions: string } | null } | null };

export type DeveloperLicenseVehiclesQueryQueryVariables = Exact<{
  clientId: any;
}>;


export type DeveloperLicenseVehiclesQueryQuery = { vehicles: { totalCount: number } };

export type DeveloperLicenseByClientIdSummaryQueryVariables = Exact<{
  clientId: any;
}>;


export type DeveloperLicenseByClientIdSummaryQuery = { developerLicense: { tokenId: number, alias: string | null, clientId: any } | null };

export type GetAllLicensesForListQueryVariables = Exact<{
  owner: any;
}>;


export type GetAllLicensesForListQuery = { developerLicenses: { ' $fragmentRefs'?: { 'DeveloperLicenseSummariesOnConnectionFragment': DeveloperLicenseSummariesOnConnectionFragment } } };

export type GetVehicleDetailQueryVariables = Exact<{
  tokenId: number;
}>;


export type GetVehicleDetailQuery = { vehicle: { tokenId: number, tokenDID: string, owner: any, mintedAt: any, imageURI: string, definition: { id: string | null, make: string | null, model: string | null, year: number | null } | null, aftermarketDevice: { tokenId: number, tokenDID: string, address: any, serial: string | null, pairedAt: any, mintedAt: any, manufacturer: { name: string } } | null, syntheticDevice: { tokenId: number, tokenDID: string, address: any, mintedAt: any, connection: { name: string, address: any } } | null, sacds: { nodes: Array<{ grantee: any, permissions: string, createdAt: any, expiresAt: any, source: string }> }, privileges: { nodes: Array<{ id: number, user: any, setAt: any, expiresAt: any }> } } | null };

export type GetDeveloperLicenseAliasQueryVariables = Exact<{
  clientId: any;
}>;


export type GetDeveloperLicenseAliasQuery = { developerLicense: { alias: string | null, clientId: any } | null };

export type GetAccountSacdsQueryVariables = Exact<{
  address: any;
}>;


export type GetAccountSacdsQuery = { account: { address: any, sacds: { nodes: Array<{ grantee: any, permissions: string, createdAt: any, expiresAt: any, source: string }> } } | null };

export type DeveloperLicenseSummaryFragmentFragment = { alias: string | null, tokenId: number, clientId: any, owner: any } & { ' $fragmentName'?: 'DeveloperLicenseSummaryFragmentFragment' };

export type TotalDeveloperLicenseCountFragmentFragment = { totalCount: number } & { ' $fragmentName'?: 'TotalDeveloperLicenseCountFragmentFragment' };

export type GetDeveloperLicensesForWebhooksQueryVariables = Exact<{
  owner: any;
}>;


export type GetDeveloperLicensesForWebhooksQuery = { developerLicenses: { nodes: Array<{ alias: string | null, clientId: any, tokenId: number, owner: any, redirectURIs: { nodes: Array<{ uri: string }> }, signers: { nodes: Array<{ address: any }> } }> } };

export type CheckHasDeveloperLicensesQueryVariables = Exact<{
  owner: any;
}>;


export type CheckHasDeveloperLicensesQuery = { developerLicenses: { ' $fragmentRefs'?: { 'TotalDeveloperLicenseCountFragmentFragment': TotalDeveloperLicenseCountFragmentFragment } } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const UserConfigurationFragmentFragmentDoc = new TypedDocumentString(`
    fragment UserConfigurationFragment on DeveloperLicense {
  tokenId
  clientId
  owner
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
    `, {"fragmentName":"UserConfigurationFragment"}) as unknown as TypedDocumentString<UserConfigurationFragmentFragment, unknown>;
export const BrandFragmentFragmentDoc = new TypedDocumentString(`
    fragment BrandFragment on DeveloperLicense {
  alias
  owner
  tokenId
  clientId
}
    `, {"fragmentName":"BrandFragment"}) as unknown as TypedDocumentString<BrandFragmentFragment, unknown>;
export const DeveloperJwtsFragmentFragmentDoc = new TypedDocumentString(`
    fragment DeveloperJwtsFragment on DeveloperLicense {
  owner
  clientId
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
    `, {"fragmentName":"DeveloperJwtsFragment"}) as unknown as TypedDocumentString<DeveloperJwtsFragmentFragment, unknown>;
export const RedirectUriFragmentFragmentDoc = new TypedDocumentString(`
    fragment RedirectUriFragment on DeveloperLicense {
  owner
  tokenId
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
    `, {"fragmentName":"RedirectUriFragment"}) as unknown as TypedDocumentString<RedirectUriFragmentFragment, unknown>;
export const SignerFragmentFragmentDoc = new TypedDocumentString(`
    fragment SignerFragment on DeveloperLicense {
  owner
  clientId
  tokenId
  signers(first: 100) {
    nodes {
      address
      enabledAt
    }
  }
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
    `, {"fragmentName":"SignerFragment"}) as unknown as TypedDocumentString<SignerFragmentFragment, unknown>;
export const DeveloperLicenseVehiclesFragmentFragmentDoc = new TypedDocumentString(`
    fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
  clientId
  tokenId
  owner
}
    `, {"fragmentName":"DeveloperLicenseVehiclesFragment"}) as unknown as TypedDocumentString<DeveloperLicenseVehiclesFragmentFragment, unknown>;
export const DeveloperLicenseSummaryFragmentFragmentDoc = new TypedDocumentString(`
    fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
  alias
  tokenId
  clientId
  owner
}
    `, {"fragmentName":"DeveloperLicenseSummaryFragment"}) as unknown as TypedDocumentString<DeveloperLicenseSummaryFragmentFragment, unknown>;
export const DeveloperLicenseSummariesOnConnectionFragmentDoc = new TypedDocumentString(`
    fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {
  nodes {
    ...DeveloperLicenseSummaryFragment
  }
}
    fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
  alias
  tokenId
  clientId
  owner
}`, {"fragmentName":"DeveloperLicenseSummariesOnConnection"}) as unknown as TypedDocumentString<DeveloperLicenseSummariesOnConnectionFragment, unknown>;
export const TotalDeveloperLicenseCountFragmentFragmentDoc = new TypedDocumentString(`
    fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {
  totalCount
}
    `, {"fragmentName":"TotalDeveloperLicenseCountFragment"}) as unknown as TypedDocumentString<TotalDeveloperLicenseCountFragmentFragment, unknown>;
export const DeveloperLicenseInfoDocument = new TypedDocumentString(`
    query DeveloperLicenseInfo($tokenId: Int!) {
  developerLicense(by: { tokenId: $tokenId }) {
    ...DeveloperLicenseSummaryFragment
    ...SignerFragment
    ...RedirectUriFragment
    ...DeveloperLicenseVehiclesFragment
    ...DeveloperJwtsFragment
    ...UserConfigurationFragment
  }
}
    fragment UserConfigurationFragment on DeveloperLicense {
  tokenId
  clientId
  owner
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment DeveloperJwtsFragment on DeveloperLicense {
  owner
  clientId
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment RedirectUriFragment on DeveloperLicense {
  owner
  tokenId
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment SignerFragment on DeveloperLicense {
  owner
  clientId
  tokenId
  signers(first: 100) {
    nodes {
      address
      enabledAt
    }
  }
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
  clientId
  tokenId
  owner
}
fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
  alias
  tokenId
  clientId
  owner
}`) as unknown as TypedDocumentString<DeveloperLicenseInfoQuery, DeveloperLicenseInfoQueryVariables>;
export const GetVehicleCountByClientIdDocument = new TypedDocumentString(`
    query GetVehicleCountByClientId($clientId: Address!) {
  vehicles(first: 0, filterBy: { privileged: $clientId }) {
    totalCount
  }
}
    `) as unknown as TypedDocumentString<GetVehicleCountByClientIdQuery, GetVehicleCountByClientIdQueryVariables>;
export const GetDeveloperLicenseDocument = new TypedDocumentString(`
    query GetDeveloperLicense($tokenId: Int!) {
  developerLicense(by: { tokenId: $tokenId }) {
    ...DeveloperLicenseSummaryFragment
    ...SignerFragment
    ...RedirectUriFragment
    ...DeveloperLicenseVehiclesFragment
    ...DeveloperJwtsFragment
    ...BrandFragment
  }
}
    fragment BrandFragment on DeveloperLicense {
  alias
  owner
  tokenId
  clientId
}
fragment DeveloperJwtsFragment on DeveloperLicense {
  owner
  clientId
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment RedirectUriFragment on DeveloperLicense {
  owner
  tokenId
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment SignerFragment on DeveloperLicense {
  owner
  clientId
  tokenId
  signers(first: 100) {
    nodes {
      address
      enabledAt
    }
  }
  redirectURIs(first: 100) {
    nodes {
      uri
    }
  }
}
fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
  clientId
  tokenId
  owner
}
fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
  alias
  tokenId
  clientId
  owner
}`) as unknown as TypedDocumentString<GetDeveloperLicenseQuery, GetDeveloperLicenseQueryVariables>;
export const GetVehiclesByClientIdDocument = new TypedDocumentString(`
    query GetVehiclesByClientId($clientId: Address!, $owner: Address, $first: Int, $last: Int, $before: String, $after: String) {
  vehicles(
    filterBy: { privileged: $clientId, owner: $owner }
    first: $first
    last: $last
    before: $before
    after: $after
  ) {
    totalCount
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
    nodes {
      tokenId
      tokenDID
      definition {
        make
        model
        year
      }
      aftermarketDevice {
        manufacturer {
          name
        }
      }
      syntheticDevice {
        connection {
          name
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetVehiclesByClientIdQuery, GetVehiclesByClientIdQueryVariables>;
export const GetVehicleForLicenseDocument = new TypedDocumentString(`
    query GetVehicleForLicense($tokenId: Int!, $clientId: Address!) {
  vehicle(tokenId: $tokenId) {
    tokenId
    tokenDID
    definition {
      make
      model
      year
    }
    aftermarketDevice {
      manufacturer {
        name
      }
    }
    syntheticDevice {
      connection {
        name
      }
    }
    sacd(grantee: $clientId) {
      permissions
    }
  }
}
    `) as unknown as TypedDocumentString<GetVehicleForLicenseQuery, GetVehicleForLicenseQueryVariables>;
export const DeveloperLicenseVehiclesQueryDocument = new TypedDocumentString(`
    query DeveloperLicenseVehiclesQuery($clientId: Address!) {
  vehicles(first: 0, filterBy: { privileged: $clientId }) {
    totalCount
  }
}
    `) as unknown as TypedDocumentString<DeveloperLicenseVehiclesQueryQuery, DeveloperLicenseVehiclesQueryQueryVariables>;
export const DeveloperLicenseByClientIdSummaryDocument = new TypedDocumentString(`
    query DeveloperLicenseByClientIdSummary($clientId: Address!) {
  developerLicense(by: { clientId: $clientId }) {
    tokenId
    alias
    clientId
  }
}
    `) as unknown as TypedDocumentString<DeveloperLicenseByClientIdSummaryQuery, DeveloperLicenseByClientIdSummaryQueryVariables>;
export const GetAllLicensesForListDocument = new TypedDocumentString(`
    query GetAllLicensesForList($owner: Address!) {
  developerLicenses(first: 100, filterBy: { owner: $owner }) {
    ...DeveloperLicenseSummariesOnConnection
  }
}
    fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {
  nodes {
    ...DeveloperLicenseSummaryFragment
  }
}
fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
  alias
  tokenId
  clientId
  owner
}`) as unknown as TypedDocumentString<GetAllLicensesForListQuery, GetAllLicensesForListQueryVariables>;
export const GetVehicleDetailDocument = new TypedDocumentString(`
    query GetVehicleDetail($tokenId: Int!) {
  vehicle(tokenId: $tokenId) {
    tokenId
    tokenDID
    owner
    mintedAt
    imageURI
    definition {
      id
      make
      model
      year
    }
    aftermarketDevice {
      tokenId
      tokenDID
      address
      serial
      pairedAt
      mintedAt
      manufacturer {
        name
      }
    }
    syntheticDevice {
      tokenId
      tokenDID
      address
      mintedAt
      connection {
        name
        address
      }
    }
    sacds(first: 100) {
      nodes {
        grantee
        permissions
        createdAt
        expiresAt
        source
      }
    }
    privileges(first: 50) {
      nodes {
        id
        user
        setAt
        expiresAt
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetVehicleDetailQuery, GetVehicleDetailQueryVariables>;
export const GetDeveloperLicenseAliasDocument = new TypedDocumentString(`
    query GetDeveloperLicenseAlias($clientId: Address!) {
  developerLicense(by: { clientId: $clientId }) {
    alias
    clientId
  }
}
    `) as unknown as TypedDocumentString<GetDeveloperLicenseAliasQuery, GetDeveloperLicenseAliasQueryVariables>;
export const GetAccountSacdsDocument = new TypedDocumentString(`
    query GetAccountSacds($address: Address!) {
  account(by: { address: $address }) {
    address
    sacds(first: 100) {
      nodes {
        grantee
        permissions
        createdAt
        expiresAt
        source
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetAccountSacdsQuery, GetAccountSacdsQueryVariables>;
export const GetDeveloperLicensesForWebhooksDocument = new TypedDocumentString(`
    query GetDeveloperLicensesForWebhooks($owner: Address!) {
  developerLicenses(first: 100, filterBy: { owner: $owner }) {
    nodes {
      alias
      clientId
      tokenId
      owner
      redirectURIs(first: 100) {
        nodes {
          uri
        }
      }
      signers(first: 100) {
        nodes {
          address
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetDeveloperLicensesForWebhooksQuery, GetDeveloperLicensesForWebhooksQueryVariables>;
export const CheckHasDeveloperLicensesDocument = new TypedDocumentString(`
    query CheckHasDeveloperLicenses($owner: Address!) {
  developerLicenses(first: 1, filterBy: { owner: $owner }) {
    ...TotalDeveloperLicenseCountFragment
  }
}
    fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {
  totalCount
}`) as unknown as TypedDocumentString<CheckHasDeveloperLicensesQuery, CheckHasDeveloperLicensesQueryVariables>;