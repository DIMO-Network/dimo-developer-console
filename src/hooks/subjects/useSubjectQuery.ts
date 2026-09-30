'use client';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  postSubjectQuery,
  type DataApi,
  type DataApiError,
  type GqlResult,
} from '@/services/subjects/client';
import type { GqlRequest } from '@/services/subjects/queries';

export const subjectQueryKey = (
  api: DataApi,
  asset: string,
  request: GqlRequest | null,
) => ['subject', api, asset, request?.query ?? '', request?.variables ?? {}] as const;

// One cache entry per (api, asset, query, variables). Data-health reads are
// safe to reuse for a minute; callers that must be fresh pass staleTime: 0.
export const useSubjectQuery = <T>(input: {
  api: DataApi;
  asset: string;
  clientId: string;
  request: GqlRequest | null;
  enabled?: boolean;
  staleTime?: number;
}): UseQueryResult<GqlResult<T>, DataApiError> =>
  useQuery<GqlResult<T>, DataApiError>({
    queryKey: [...subjectQueryKey(input.api, input.asset, input.request), input.clientId],
    queryFn: () =>
      postSubjectQuery<T>(input.api, {
        asset: input.asset,
        clientId: input.clientId,
        request: input.request as GqlRequest,
      }),
    enabled: (input.enabled ?? true) && !!input.request && !!input.clientId,
    staleTime: input.staleTime ?? 60_000,
    retry: false,
  });
