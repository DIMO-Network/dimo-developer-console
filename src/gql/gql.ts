/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

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
    "\n  query GetDeveloperLicensesByOwner($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n": typeof types.GetDeveloperLicensesByOwnerDocument,
    "\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": typeof types.DeveloperJwtsFragmentFragmentDoc,
    "\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": typeof types.RedirectUriFragmentFragmentDoc,
    "\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n  }\n": typeof types.SignerFragmentFragmentDoc,
    "\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n  }\n": typeof types.DeveloperLicenseVehiclesFragmentFragmentDoc,
    "\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n": typeof types.GetVehicleCountByClientIdDocument,
    "\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment   \n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n    }\n  }\n": typeof types.GetDeveloperLicenseDocument,
    "\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n": typeof types.DeveloperLicenseSummariesOnConnectionFragmentDoc,
    "\n  query GetVehiclesByClientId($clientId: Address!, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        definition {\n          make\n          model\n          year\n        }\n      }  \n    }\n  }\n": typeof types.GetVehiclesByClientIdDocument,
    "\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n": typeof types.DeveloperLicenseVehiclesQueryDocument,
    "\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n": typeof types.DeveloperLicenseByClientIdSummaryDocument,
    "\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n": typeof types.DeveloperLicenseSummaryFragmentFragmentDoc,
    "\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n": typeof types.TotalDeveloperLicenseCountFragmentFragmentDoc,
    "\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetDeveloperLicensesForWebhooksDocument,
};
const documents: Documents = {
    "\n  query GetDeveloperLicensesByOwner($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n": types.GetDeveloperLicensesByOwnerDocument,
    "\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": types.DeveloperJwtsFragmentFragmentDoc,
    "\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n": types.RedirectUriFragmentFragmentDoc,
    "\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n  }\n": types.SignerFragmentFragmentDoc,
    "\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n  }\n": types.DeveloperLicenseVehiclesFragmentFragmentDoc,
    "\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n": types.GetVehicleCountByClientIdDocument,
    "\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment   \n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n    }\n  }\n": types.GetDeveloperLicenseDocument,
    "\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n": types.DeveloperLicenseSummariesOnConnectionFragmentDoc,
    "\n  query GetVehiclesByClientId($clientId: Address!, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        definition {\n          make\n          model\n          year\n        }\n      }  \n    }\n  }\n": types.GetVehiclesByClientIdDocument,
    "\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n": types.DeveloperLicenseVehiclesQueryDocument,
    "\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n": types.DeveloperLicenseByClientIdSummaryDocument,
    "\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n": types.DeveloperLicenseSummaryFragmentFragmentDoc,
    "\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n": types.TotalDeveloperLicenseCountFragmentFragmentDoc,
    "\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n      }\n    }\n  }\n": types.GetDeveloperLicensesForWebhooksDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetDeveloperLicensesByOwner($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n"): (typeof documents)["\n  query GetDeveloperLicensesByOwner($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      ...TotalDeveloperLicenseCountFragment\n      ...DeveloperLicenseSummariesOnConnection\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment DeveloperJwtsFragment on DeveloperLicense {\n    owner\n    clientId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment RedirectUriFragment on DeveloperLicense {\n    owner\n    tokenId\n    redirectURIs(first:100) {\n      nodes {\n        uri\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment SignerFragment on DeveloperLicense {\n    owner\n    tokenId\n    signers(first:100) {\n      nodes {\n        address\n        enabledAt\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n  }\n"): (typeof documents)["\n  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {\n    clientId\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n"): (typeof documents)["\n  query GetVehicleCountByClientId($clientId:Address!) {\n    vehicles(first:0, filterBy:{privileged:$clientId}) {\n      totalCount\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment   \n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n    }\n  }\n"): (typeof documents)["\n  query GetDeveloperLicense($tokenId: Int!) {\n    developerLicense(by: {tokenId: $tokenId}) {\n      ...DeveloperLicenseSummaryFragment   \n      ...SignerFragment\n      ...RedirectUriFragment\n      ...DeveloperLicenseVehiclesFragment\n      ...DeveloperJwtsFragment\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n"): (typeof documents)["\n  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {\n    nodes {\n      ...DeveloperLicenseSummaryFragment\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVehiclesByClientId($clientId: Address!, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        definition {\n          make\n          model\n          year\n        }\n      }  \n    }\n  }\n"): (typeof documents)["\n  query GetVehiclesByClientId($clientId: Address!, $first: Int, $last: Int, $before: String, $after: String) {\n    vehicles(filterBy:{ privileged: $clientId }, first: $first, last: $last, before:$before, after:$after) {\n      totalCount\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n      nodes {\n        tokenId\n        definition {\n          make\n          model\n          year\n        }\n      }  \n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n"): (typeof documents)["\n  query DeveloperLicenseVehiclesQuery($clientId: Address!) {\n    vehicles(first: 0, filterBy: { privileged: $clientId }) {\n      totalCount\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n"): (typeof documents)["\n  query DeveloperLicenseByClientIdSummary($clientId: Address!) {\n    developerLicense(by: {clientId: $clientId}) {\n      tokenId\n      alias\n      clientId\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n"): (typeof documents)["\n  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {\n    alias\n    tokenId\n    clientId\n    owner\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n"): (typeof documents)["\n  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {\n    totalCount\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetDeveloperLicensesForWebhooks($owner: Address!) {\n    developerLicenses(first: 100, filterBy: { owner: $owner }) {\n      nodes {\n        alias\n        clientId\n        redirectURIs(first:100) {\n          nodes {\n            uri\n          }\n        }\n      }\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;