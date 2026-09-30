'use client';
import { useMemo } from 'react';
import { useSubjectQuery } from './useSubjectQuery';
import { freshnessQuery } from '@/services/subjects/queries';
import { fieldError } from '@/services/subjects/client';
import type { Subject, SubjectGraph } from '@/services/subjects/graph';

export type LatestIndexHeader = {
  time: string | null;
  type: string | null;
  source: string | null;
  producer: string | null;
};
type FreshnessData = Record<string, { header: LatestIndexHeader } | null>;

const EMPTY: LatestIndexHeader = { time: null, type: null, source: null, producer: null };

// One aliased latestIndex call for the vehicle and its devices (they share the
// vehicle token). Each alias is the subject's Fetch scope; results are keyed by
// the subject's own DID. The account subject is a different asset: DocumentsTab
// asks for it separately, so a missing account grant never blanks the rail.
export const useSubjectFreshness = (input: {
  graph: SubjectGraph | null;
  clientId: string;
  enabled?: boolean;
}) => {
  const subjects = useMemo<Subject[]>(
    () => (input.graph ? [input.graph.vehicle, ...input.graph.devices] : []),
    [input.graph],
  );
  const request = useMemo(
    () =>
      subjects.length
        ? freshnessQuery(
            subjects.map((s) => ({ did: s.fetchDid, producer: s.fetchFilter?.producer })),
          )
        : null,
    [subjects],
  );
  const q = useSubjectQuery<FreshnessData>({
    api: 'fetch',
    asset: input.graph?.vehicle.asset ?? '',
    clientId: input.clientId,
    request,
    enabled: (input.enabled ?? true) && !!input.graph,
    staleTime: 30_000,
  });
  const { byDid, errorByDid } = useMemo(() => {
    const times: Record<string, LatestIndexHeader> = {};
    const errors: Record<string, string | null> = {};
    subjects.forEach((s, i) => {
      times[s.did] = q.data?.data?.[`s${i}`]?.header ?? EMPTY;
      errors[s.did] = q.error?.message ?? fieldError(q.data?.errors, `s${i}`);
    });
    return { byDid: times, errorByDid: errors };
  }, [subjects, q.data, q.error]);
  return {
    byDid,
    errorByDid,
    isLoading: q.isLoading,
    error: q.error ?? null,
    refetch: q.refetch,
  };
};
