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
    "\n  fragment DeveloperLicenseSummary on DeveloperLicense {\n    owner\n    tokenId\n    alias\n    clientId\n  }\n": typeof types.DeveloperLicenseSummaryFragmentDoc,
    "\n    query DeveloperLicenseByTokenId($tokenId: Int!) {\n        developerLicense(by: { tokenId: $tokenId }) {\n            ...DeveloperLicenseSummary\n        }\n    }\n": typeof types.DeveloperLicenseByTokenIdDocument,
};
const documents: Documents = {
    "\n  fragment DeveloperLicenseSummary on DeveloperLicense {\n    owner\n    tokenId\n    alias\n    clientId\n  }\n": types.DeveloperLicenseSummaryFragmentDoc,
    "\n    query DeveloperLicenseByTokenId($tokenId: Int!) {\n        developerLicense(by: { tokenId: $tokenId }) {\n            ...DeveloperLicenseSummary\n        }\n    }\n": types.DeveloperLicenseByTokenIdDocument,
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
export function gql(source: "\n  fragment DeveloperLicenseSummary on DeveloperLicense {\n    owner\n    tokenId\n    alias\n    clientId\n  }\n"): (typeof documents)["\n  fragment DeveloperLicenseSummary on DeveloperLicense {\n    owner\n    tokenId\n    alias\n    clientId\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    query DeveloperLicenseByTokenId($tokenId: Int!) {\n        developerLicense(by: { tokenId: $tokenId }) {\n            ...DeveloperLicenseSummary\n        }\n    }\n"): (typeof documents)["\n    query DeveloperLicenseByTokenId($tokenId: Int!) {\n        developerLicense(by: { tokenId: $tokenId }) {\n            ...DeveloperLicenseSummary\n        }\n    }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;