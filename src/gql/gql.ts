/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment UserConfigurationFragment on DeveloperLicense {\n    tokenId\n    clientId\n    owner\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": typeof types.UserConfigurationFragmentFragmentDoc,
    "\n  query DeveloperLicenseInfo($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment\n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n      ...UserConfigurationFragment\n    }\n  }\n": typeof types.DeveloperLicenseInfoDocument,
    "\n  fragment BrandFragment on DeveloperLicense {\n    alias\n    owner\n    tokenId\n    clientId\n  }\n": typeof types.BrandFragmentFragmentDoc,
    "\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": typeof types.DeveloperJwtsFragmentFragmentDoc,
    "\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": typeof types.RedirectUriFragmentFragmentDoc,
    "\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    clientId\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": typeof types.SignerFragmentFragmentDoc,
    "\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n    tokenId\n    owner\n  }\n": typeof types.DeveloperLicenseVehiclesFragmentFragmentDoc,
    "\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n": typeof types.GetVehicleCountByClientIdDocument,
    "\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment\n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n      ...BrandFragment\n    }\n  }\n": typeof types.GetDeveloperLicenseDocument,
    "\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n": typeof types.DeveloperLicenseSummariesOnConnectionFragmentDoc,
    "\n  query GetVehiclesByClientId($clientId: Address!, $owner: Address, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId, owner: $owner }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        tokenDID\n        definition {\n          make\n          model\n          year\n        }\n        aftermarketDevice { manufacturer { name } }\n        syntheticDevice { connection { name } }\n      }\n    }\n  }\n": typeof types.GetVehiclesByClientIdDocument,
    "\n  query GetVehicleForLicense($tokenId: Int!, $clientId: Address!) {\n    vehicle(tokenId: $tokenId) {\n      tokenId\n      tokenDID\n      definition { make model year }\n      aftermarketDevice { manufacturer { name } }\n      syntheticDevice { connection { name } }\n      sacd(grantee: $clientId) { permissions }\n    }\n  }\n": typeof types.GetVehicleForLicenseDocument,
    "\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n": typeof types.DeveloperLicenseVehiclesQueryDocument,
    "\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n": typeof types.DeveloperLicenseByClientIdSummaryDocument,
    "\n  query GetAllLicensesForList($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n": typeof types.GetAllLicensesForListDocument,
    "\n  query GetVehicleDetail($tokenId: Int!) {\n    vehicle(tokenId: $tokenId) {\n      tokenId\n      tokenDID\n      owner\n      mintedAt\n      imageURI\n      definition { id make model year }\n      aftermarketDevice {\n        tokenId\n        tokenDID\n        address\n        serial\n        pairedAt\n        mintedAt\n        manufacturer { name }\n      }\n      syntheticDevice {\n        tokenId\n        tokenDID\n        address\n        mintedAt\n        connection { name address }\n      }\n      sacds(first: 100) {\n        nodes { grantee permissions createdAt expiresAt source }\n      }\n      privileges(first: 50) {\n        nodes { id user setAt expiresAt }\n      }\n    }\n  }\n": typeof types.GetVehicleDetailDocument,
    "\n  query GetDeveloperLicenseAlias($clientId: Address!) {\n    developerLicense(by: { clientId: $clientId }) {\n      alias\n      clientId\n    }\n  }\n": typeof types.GetDeveloperLicenseAliasDocument,
    "\n  query GetAccountSacds($address: Address!) {\n    account(by: { address: $address }) {\n      address\n      sacds(first: 100) {\n        nodes { grantee permissions createdAt expiresAt source }\n      }\n    }\n  }\n": typeof types.GetAccountSacdsDocument,
    "\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n": typeof types.DeveloperLicenseSummaryFragmentFragmentDoc,
    "\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n": typeof types.TotalDeveloperLicenseCountFragmentFragmentDoc,
    "\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        tokenId\n        owner\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n        signers(first:100) {\n          nodes {\n            address\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetDeveloperLicensesForWebhooksDocument,
    "\n  query CheckHasDeveloperLicenses($owner: Address!) {\n    developerLicenses(first: 1, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n    }\n  }\n": typeof types.CheckHasDeveloperLicensesDocument,
};
const documents: Documents = {
    "\n  fragment UserConfigurationFragment on DeveloperLicense {\n    tokenId\n    clientId\n    owner\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": types.UserConfigurationFragmentFragmentDoc,
    "\n  query DeveloperLicenseInfo($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment\n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n      ...UserConfigurationFragment\n    }\n  }\n": types.DeveloperLicenseInfoDocument,
    "\n  fragment BrandFragment on DeveloperLicense {\n    alias\n    owner\n    tokenId\n    clientId\n  }\n": types.BrandFragmentFragmentDoc,
    "\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": types.DeveloperJwtsFragmentFragmentDoc,
    "\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": types.RedirectUriFragmentFragmentDoc,
    "\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    clientId\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": types.SignerFragmentFragmentDoc,
    "\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n    tokenId\n    owner\n  }\n": types.DeveloperLicenseVehiclesFragmentFragmentDoc,
    "\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n": types.GetVehicleCountByClientIdDocument,
    "\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment\n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n      ...BrandFragment\n    }\n  }\n": types.GetDeveloperLicenseDocument,
    "\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n": types.DeveloperLicenseSummariesOnConnectionFragmentDoc,
    "\n  query GetVehiclesByClientId($clientId: Address!, $owner: Address, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId, owner: $owner }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        tokenDID\n        definition {\n          make\n          model\n          year\n        }\n        aftermarketDevice { manufacturer { name } }\n        syntheticDevice { connection { name } }\n      }\n    }\n  }\n": types.GetVehiclesByClientIdDocument,
    "\n  query GetVehicleForLicense($tokenId: Int!, $clientId: Address!) {\n    vehicle(tokenId: $tokenId) {\n      tokenId\n      tokenDID\n      definition { make model year }\n      aftermarketDevice { manufacturer { name } }\n      syntheticDevice { connection { name } }\n      sacd(grantee: $clientId) { permissions }\n    }\n  }\n": types.GetVehicleForLicenseDocument,
    "\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n": types.DeveloperLicenseVehiclesQueryDocument,
    "\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n": types.DeveloperLicenseByClientIdSummaryDocument,
    "\n  query GetAllLicensesForList($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n": types.GetAllLicensesForListDocument,
    "\n  query GetVehicleDetail($tokenId: Int!) {\n    vehicle(tokenId: $tokenId) {\n      tokenId\n      tokenDID\n      owner\n      mintedAt\n      imageURI\n      definition { id make model year }\n      aftermarketDevice {\n        tokenId\n        tokenDID\n        address\n        serial\n        pairedAt\n        mintedAt\n        manufacturer { name }\n      }\n      syntheticDevice {\n        tokenId\n        tokenDID\n        address\n        mintedAt\n        connection { name address }\n      }\n      sacds(first: 100) {\n        nodes { grantee permissions createdAt expiresAt source }\n      }\n      privileges(first: 50) {\n        nodes { id user setAt expiresAt }\n      }\n    }\n  }\n": types.GetVehicleDetailDocument,
    "\n  query GetDeveloperLicenseAlias($clientId: Address!) {\n    developerLicense(by: { clientId: $clientId }) {\n      alias\n      clientId\n    }\n  }\n": types.GetDeveloperLicenseAliasDocument,
    "\n  query GetAccountSacds($address: Address!) {\n    account(by: { address: $address }) {\n      address\n      sacds(first: 100) {\n        nodes { grantee permissions createdAt expiresAt source }\n      }\n    }\n  }\n": types.GetAccountSacdsDocument,
    "\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n": types.DeveloperLicenseSummaryFragmentFragmentDoc,
    "\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n": types.TotalDeveloperLicenseCountFragmentFragmentDoc,
    "\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        tokenId\n        owner\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n        signers(first:100) {\n          nodes {\n            address\n          }\n        }\n      }\n    }\n  }\n": types.GetDeveloperLicensesForWebhooksDocument,
    "\n  query CheckHasDeveloperLicenses($owner: Address!) {\n    developerLicenses(first: 1, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n    }\n  }\n": types.CheckHasDeveloperLicensesDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment UserConfigurationFragment on DeveloperLicense {\n    tokenId\n    clientId\n    owner\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"): typeof import('./graphql').UserConfigurationFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DeveloperLicenseInfo($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment\n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n      ...UserConfigurationFragment\n    }\n  }\n"): typeof import('./graphql').DeveloperLicenseInfoDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment BrandFragment on DeveloperLicense {\n    alias\n    owner\n    tokenId\n    clientId\n  }\n"): typeof import('./graphql').BrandFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"): typeof import('./graphql').DeveloperJwtsFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"): typeof import('./graphql').RedirectUriFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    clientId\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"): typeof import('./graphql').SignerFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n    tokenId\n    owner\n  }\n"): typeof import('./graphql').DeveloperLicenseVehiclesFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n"): typeof import('./graphql').GetVehicleCountByClientIdDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment\n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n      ...BrandFragment\n    }\n  }\n"): typeof import('./graphql').GetDeveloperLicenseDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n"): typeof import('./graphql').DeveloperLicenseSummariesOnConnectionFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVehiclesByClientId($clientId: Address!, $owner: Address, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId, owner: $owner }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        tokenDID\n        definition {\n          make\n          model\n          year\n        }\n        aftermarketDevice { manufacturer { name } }\n        syntheticDevice { connection { name } }\n      }\n    }\n  }\n"): typeof import('./graphql').GetVehiclesByClientIdDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVehicleForLicense($tokenId: Int!, $clientId: Address!) {\n    vehicle(tokenId: $tokenId) {\n      tokenId\n      tokenDID\n      definition { make model year }\n      aftermarketDevice { manufacturer { name } }\n      syntheticDevice { connection { name } }\n      sacd(grantee: $clientId) { permissions }\n    }\n  }\n"): typeof import('./graphql').GetVehicleForLicenseDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n"): typeof import('./graphql').DeveloperLicenseVehiclesQueryDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n"): typeof import('./graphql').DeveloperLicenseByClientIdSummaryDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAllLicensesForList($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n"): typeof import('./graphql').GetAllLicensesForListDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVehicleDetail($tokenId: Int!) {\n    vehicle(tokenId: $tokenId) {\n      tokenId\n      tokenDID\n      owner\n      mintedAt\n      imageURI\n      definition { id make model year }\n      aftermarketDevice {\n        tokenId\n        tokenDID\n        address\n        serial\n        pairedAt\n        mintedAt\n        manufacturer { name }\n      }\n      syntheticDevice {\n        tokenId\n        tokenDID\n        address\n        mintedAt\n        connection { name address }\n      }\n      sacds(first: 100) {\n        nodes { grantee permissions createdAt expiresAt source }\n      }\n      privileges(first: 50) {\n        nodes { id user setAt expiresAt }\n      }\n    }\n  }\n"): typeof import('./graphql').GetVehicleDetailDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetDeveloperLicenseAlias($clientId: Address!) {\n    developerLicense(by: { clientId: $clientId }) {\n      alias\n      clientId\n    }\n  }\n"): typeof import('./graphql').GetDeveloperLicenseAliasDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAccountSacds($address: Address!) {\n    account(by: { address: $address }) {\n      address\n      sacds(first: 100) {\n        nodes { grantee permissions createdAt expiresAt source }\n      }\n    }\n  }\n"): typeof import('./graphql').GetAccountSacdsDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n"): typeof import('./graphql').DeveloperLicenseSummaryFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n"): typeof import('./graphql').TotalDeveloperLicenseCountFragmentFragmentDoc;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        tokenId\n        owner\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n        signers(first:100) {\n          nodes {\n            address\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').GetDeveloperLicensesForWebhooksDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query CheckHasDeveloperLicenses($owner: Address!) {\n    developerLicenses(first: 1, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n    }\n  }\n"): typeof import('./graphql').CheckHasDeveloperLicensesDocument;


export function gql(source: string) {
  return (documents as any)[source] ?? {};
}
