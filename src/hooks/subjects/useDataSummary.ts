'use client';
import { useQueries } from '@tanstack/react-query';
import { useSubjectQuery, subjectQueryKey } from './useSubjectQuery';
import { dataSummaryQuery } from '@/services/subjects/queries';
import { fieldError, postSubjectQuery } from '@/services/subjects/client';
import {
  isDevice,
  resolveTelemetrySource,
  type Subject,
} from '@/services/subjects/graph';
import type { SubjectContext } from '@/app/vehicles/[tokenId]/components/SubjectView';

export type DataSummary = {
  numberOfSignals: number;
  availableSignals: string[];
  firstSeen: string;
  lastSeen: string;
  signalDataSummary: {
    name: string;
    numberOfSignals: number;
    firstSeen: string;
    lastSeen: string;
  }[];
  eventDataSummary: {
    name: string;
    numberOfEvents: number;
    firstSeen: string;
    lastSeen: string;
  }[];
};
type Data = { dataSummary: DataSummary | null };

// The subject's telemetry source: a device filters by the connection that
// produced its latest cloud event; the vehicle has no filter.
export const useTelemetrySource = (subject: Subject, ctx: SubjectContext) =>
  resolveTelemetrySource(
    subject,
    ctx.freshness[subject.did]?.source ?? null,
    ctx.chainId,
  );

export const useDataSummary = (subject: Subject, ctx: SubjectContext) => {
  const source = useTelemetrySource(subject, ctx);
  const tokenId = subject.tokenId ?? 0;
  const q = useSubjectQuery<Data>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: subject.tokenId ? dataSummaryQuery(tokenId, source) : null,
  });

  // For the vehicle view: which device each signal comes from (one summary per
  // device source; a device without a source is skipped).
  const deviceSources = ctx.graph.devices
    .map((d) => ({
      d,
      source: resolveTelemetrySource(
        d,
        ctx.freshness[d.did]?.source ?? null,
        ctx.chainId,
      ),
    }))
    .filter((x): x is { d: Subject; source: string } => !!x.source);
  // useQueries takes a list, so the count of per-device requests may change
  // (freshness arrives async) without changing the hook count.
  const perDevice = useQueries({
    queries:
      subject.kind === 'vehicle'
        ? deviceSources.map((x) => {
            const request = dataSummaryQuery(tokenId, x.source);
            return {
              queryKey: [
                ...subjectQueryKey('telemetry', subject.asset, request),
                ctx.clientId,
              ],
              queryFn: () =>
                postSubjectQuery<Data>('telemetry', {
                  asset: subject.asset,
                  clientId: ctx.clientId,
                  request,
                }),
              enabled: !!ctx.clientId,
              staleTime: 60_000,
              retry: false,
            };
          })
        : [],
  });
  const fromBySignal: Record<string, string[]> = {};
  perDevice.forEach((pq, i) => {
    for (const s of pq.data?.data?.dataSummary?.signalDataSummary ?? []) {
      (fromBySignal[s.name] ??= []).push(deviceSources[i].d.label);
    }
  });

  return {
    summary: q.data?.data?.dataSummary ?? null,
    error: q.error?.message ?? fieldError(q.data?.errors, 'dataSummary'),
    isLoading: q.isLoading,
    source,
    unresolvedSource: isDevice(subject) && !source,
    fromBySignal,
  };
};
