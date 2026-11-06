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

// Identity answers in about 0.2 s (p95 1.3 s). A request still open after
// this never will: it fails, so nothing waits on it forever (a page turn
// keeps its buttons disabled until its request settles).
export const IDENTITY_TIMEOUT_MS = 15_000;

// Aborts on the caller's signal or after `ms`, whichever comes first.
const withTimeout = (signal: AbortSignal | undefined, ms: number) => {
  const controller = new AbortController();
  const stop = () => controller.abort();
  const timer = setTimeout(stop, ms);
  if (signal?.aborted) stop();
  signal?.addEventListener('abort', stop);
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
    },
  };
};

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
  // null only with errorPolicy 'ignore', when Identity sent errors and no data.
): Promise<TResult | null> => {
  const request = withTimeout(signal, IDENTITY_TIMEOUT_MS);
  let response: Response;
  let body: GraphQLResponse<TResult> | null;
  try {
    response = await fetch(config.identityApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: query.toString(), variables: variables ?? {} }),
      signal: request.signal,
    });
    body = (await response.json().catch(() => null)) as GraphQLResponse<TResult> | null;
  } finally {
    request.done();
  }

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
  // TanStack Query refuses undefined: no data is null.
  return body.data ?? null;
};
