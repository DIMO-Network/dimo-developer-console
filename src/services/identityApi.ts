import config from '@/config';
import type { TypedDocumentString } from '@/gql/graphql';
import { HttpError } from '@/utils/httpError';

// Identity API reads, as the mobile app makes them: the generated query string
// and its variables, POSTed. No GraphQL client: the console only reads, and
// TanStack Query does the caching.

export interface GraphQLErrorEntry {
  message: string;
  path?: (string | number)[];
}

// Identity answered, with errors instead of (or beside) data: the query or its
// variables are wrong, or what they name doesn't exist. Asking again won't help.
export class IdentityGraphQLError extends Error {
  constructor(readonly errors: GraphQLErrorEntry[]) {
    super(errors.map((error) => error.message).join('\n') || 'Identity API error');
    this.name = 'IdentityGraphQLError';
  }
}

export type IdentityErrorPolicy = 'none' | 'ignore';

interface GraphQLResponse<TResult> {
  data?: TResult | null;
  errors?: GraphQLErrorEntry[];
}

/**
 * Runs one Identity API query.
 *
 * errorPolicy 'none' (the default) throws on any GraphQL error, as Apollo did;
 * 'ignore' drops them and returns whatever data came back.
 * An HTTP failure is an HttpError, so the query retry policy sees its status.
 */
export const fetchIdentity = async <TResult, TVariables>(
  query: TypedDocumentString<TResult, TVariables>,
  variables?: TVariables,
  {
    signal,
    errorPolicy = 'none',
  }: { signal?: AbortSignal; errorPolicy?: IdentityErrorPolicy } = {},
): Promise<TResult> => {
  const response = await fetch(config.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: query.toString(), variables: variables ?? {} }),
    signal,
  });
  const body = (await response
    .json()
    .catch(() => null)) as GraphQLResponse<TResult> | null;

  if (!response.ok) {
    throw new HttpError(
      response.status,
      body?.errors?.[0]?.message ?? `Identity API answered ${response.status}`,
    );
  }
  if (body?.errors?.length && errorPolicy !== 'ignore') {
    throw new IdentityGraphQLError(body.errors);
  }
  if (!body || (body.data == null && errorPolicy !== 'ignore')) {
    throw new HttpError(response.status, 'Identity API answered without data');
  }
  return (body.data ?? undefined) as TResult;
};
