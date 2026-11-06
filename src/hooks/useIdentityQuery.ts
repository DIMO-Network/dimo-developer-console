'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedDocumentString } from '@/gql/graphql';
import { defaultQueryRetry } from '@/hoc/QueryProvider';
import {
  fetchIdentity,
  IdentityGraphQLError,
  type IdentityErrorPolicy,
} from '@/services/identityApi';

// An Identity API query through TanStack Query, shaped like Apollo's useQuery
// (data, loading, error, refetch), which it replaces.

export interface IdentityQueryOptions<TVariables> {
  variables?: TVariables;
  // Not run, and nothing returned: no data, not loading, no error.
  skip?: boolean;
  errorPolicy?: IdentityErrorPolicy;
}

export interface IdentityQueryResult<TResult, TVariables> {
  data: TResult | undefined;
  // Only while there's nothing to show yet: a refetch keeps the data on screen.
  loading: boolean;
  error: Error | undefined;
  // With variables, they're merged into the query's, and its data stays until
  // the new data is in (paging, a refreshed id). Rejects when it fails.
  refetch: (variables?: Partial<TVariables>) => Promise<{ data: TResult | undefined }>;
}

const OPERATION_NAME = /\b(?:query|mutation)\s+(\w+)/;
// Each document is read once: its name is the same every render.
const operationNames = new WeakMap<object, string>();
const nameIn = (text: string) => OPERATION_NAME.exec(text)?.[1] ?? text;
const operationName = (query: TypedDocumentString<unknown, unknown>) => {
  // Generated documents are objects; a plain string cast to one isn't cached.
  if (typeof query !== 'object') return nameIn(String(query));
  const name = operationNames.get(query) ?? nameIn(query.toString());
  operationNames.set(query, name);
  return name;
};

export const identityQueryKey = (
  query: TypedDocumentString<unknown, unknown>,
  variables: unknown,
  errorPolicy: IdentityErrorPolicy = 'none',
) => [
  'identity',
  operationName(query),
  variables ?? {},
  ...(errorPolicy === 'none' ? [] : [errorPolicy]),
];

// Apollo never refetched what it had cached. Fresh for 30 s, a page that's
// revisited soon reads the cache, and a page of results fetched by refetch()
// isn't fetched again when the query moves to it; refetch() always asks.
export const IDENTITY_STALE_MS = 30_000;

// A GraphQL error repeats; HTTP and network failures get the usual retry.
const retry = (failureCount: number, error: unknown) =>
  !(error instanceof IdentityGraphQLError) && defaultQueryRetry(failureCount, error);

// A rejection nobody awaits (a paging handler) isn't reported as unhandled;
// a caller that awaits still gets it.
const handled = <T>(promise: Promise<T>) => {
  promise.catch(() => undefined);
  return promise;
};

export const useIdentityQuery = <TResult, TVariables>(
  query: TypedDocumentString<TResult, TVariables>,
  // The query's own variable types, not ones widened from the object passed.
  {
    variables,
    skip = false,
    errorPolicy = 'none',
  }: IdentityQueryOptions<NoInfer<TVariables>> = {},
): IdentityQueryResult<TResult, TVariables> => {
  const queryClient = useQueryClient();
  // Variables a refetch moved to, for as long as the caller's stay the same.
  // New caller variables start over (a new filter is page 1), and going back
  // to the old ones doesn't bring their old page back.
  const base = JSON.stringify(variables ?? {});
  const [moved, setMoved] = useState<{ from: string; to: Partial<TVariables> } | null>(
    null,
  );
  if (moved && moved.from !== base) setMoved(null);
  const current = (
    moved?.from === base ? { ...variables, ...moved.to } : variables
  ) as TVariables;

  const optionsFor = (vars: TVariables) => ({
    queryKey: identityQueryKey(
      query as TypedDocumentString<unknown, unknown>,
      vars,
      errorPolicy,
    ),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchIdentity(query, vars, { signal, errorPolicy }),
    retry,
    staleTime: IDENTITY_STALE_MS,
  });

  const result = useQuery({
    ...optionsFor(current),
    enabled: !skip,
    // Apollo didn't refetch on focus; pages that fill forms from this data
    // rely on it staying put.
    refetchOnWindowFocus: false,
  });

  const { refetch: refetchCurrent } = result;
  const refetch = useCallback(
    (next?: Partial<TVariables>) =>
      handled(
        (async () => {
          const target = { ...current, ...next } as TVariables;
          if (next && JSON.stringify(target) !== JSON.stringify(current)) {
            // Moves only once the new data is in: a failure leaves the
            // current data on screen and rejects.
            const data = await queryClient.fetchQuery(optionsFor(target));
            setMoved({
              from: base,
              to: { ...(moved?.from === base ? moved.to : {}), ...next },
            });
            return { data: data ?? undefined };
          }
          const outcome = await refetchCurrent();
          if (outcome.error) throw outcome.error;
          return { data: outcome.data ?? undefined };
        })(),
      ),
    // optionsFor reads query and errorPolicy, both part of these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, moved, query, errorPolicy, queryClient, refetchCurrent],
  );

  if (skip) return { data: undefined, loading: false, error: undefined, refetch };
  return {
    // errorPolicy 'ignore' can leave no data: null in the cache, none here.
    data: result.data ?? undefined,
    loading: result.isLoading,
    error: (result.error as Error | null) ?? undefined,
    refetch,
  };
};

export default useIdentityQuery;
