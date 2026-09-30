'use client';
import { useMemo } from 'react';
import { useSubjectQuery } from './useSubjectQuery';
import { freshnessQuery } from '@/services/subjects/queries';
import type { SubjectGraph } from '@/services/subjects/graph';

export type LatestIndexHeader = {
  time: string | null;
  type: string | null;
  source: string | null;
  producer: string | null;
};
type FreshnessData = Record<string, { header: LatestIndexHeader } | null>;

// One aliased latestIndex call for the vehicle and its devices (they share the
// vehicle token). The account subject is a different asset: DocumentsTab asks
// for it separately, so a missing account grant never blanks the rail.
export const useSubjectFreshness = (input: {
  graph: SubjectGraph | null;
  clientId: string;
  enabled?: boolean;
}) => {
  const dids = useMemo(
    () =>
      input.graph
        ? [input.graph.vehicle.did, ...input.graph.devices.map((d) => d.did)]
        : [],
    [input.graph],
  );
  const request = useMemo(() => (dids.length ? freshnessQuery(dids) : null), [dids]);
  const q = useSubjectQuery<FreshnessData>({
    api: 'fetch',
    asset: input.graph?.vehicle.asset ?? '',
    clientId: input.clientId,
    request,
    enabled: (input.enabled ?? true) && !!input.graph,
    staleTime: 30_000,
  });
  const byDid = useMemo(() => {
    const out: Record<string, LatestIndexHeader> = {};
    dids.forEach((did, i) => {
      const h = q.data?.data?.[`s${i}`]?.header;
      out[did] = h ?? { time: null, type: null, source: null, producer: null };
    });
    return out;
  }, [dids, q.data]);
  return { byDid, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
};
