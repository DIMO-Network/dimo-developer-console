'use client';
import { FC, useState } from 'react';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useDataSummary } from '@/hooks/subjects/useDataSummary';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
} from '@/services/subjects/queries';
import { fieldError } from '@/services/subjects/client';
import { StatCard, compact } from '../StatCard';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { FreshnessDot } from '@/components/FreshnessDot';
import { JsonBlock } from '@/components/JsonBlock';
import { Button } from '@/components/Button';
import { SignalTable, SignalFilter } from './SignalTable';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { relativeTime, absoluteTime, utcDate } from '@/utils/freshness';

type Types = {
  availableCloudEventTypes:
    | { type: string; count: number; firstSeen: string; lastSeen: string }[]
    | null;
};
type Latest = {
  latestCloudEvent: { header: Record<string, string>; data: unknown } | null;
};

const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000));

const Problem: FC<{ message: string }> = ({ message }) => (
  <p className="px-5 py-3 text-body-sm text-negative">{message}</p>
);

export const SummaryTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const [filter, setFilter] = useState('');
  const { summary, error, isLoading, unresolvedSource, fromBySignal } = useDataSummary(
    subject,
    ctx,
  );
  const types = useSubjectQuery<Types>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(subject.did),
  });
  const latest = useSubjectQuery<Latest>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestCloudEventQuery(subject.did, {}, false),
  });

  const latestAt =
    latest.data?.data?.latestCloudEvent?.header?.time ??
    ctx.freshness[subject.did]?.time ??
    null;
  const latestType =
    latest.data?.data?.latestCloudEvent?.header?.type ?? ctx.freshness[subject.did]?.type;
  const producer = latest.data?.data?.latestCloudEvent?.header?.producer;
  const producerLabel = ctx.graph.all.find((s) => s.did === producer)?.label;
  const typeRows = types.data?.data?.availableCloudEventTypes ?? [];
  const isVehicle = subject.kind === 'vehicle';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <StatCard
          label="Latest payload"
          className="col-span-2 md:col-span-1"
          value={<FreshnessDot at={latestAt} label={false} className="gap-3" />}
          caption={
            latestAt
              ? `${absoluteTime(latestAt)}${latestType ? ` · ${latestType}` : ''}${producerLabel ? ` from ${producerLabel}` : ''}`
              : 'No payload yet'
          }
        />
        <StatCard
          label="First seen"
          value={summary ? utcDate(summary.firstSeen) : '—'}
          caption={
            summary
              ? `${daysBetween(summary.firstSeen, summary.lastSeen)} days of data`
              : undefined
          }
        />
        <StatCard
          label="Data points"
          value={summary ? compact(summary.numberOfSignals) : '—'}
          caption={
            summary ? `Across ${summary.availableSignals.length} signals` : undefined
          }
        />
        <StatCard
          label="Signals"
          value={summary ? summary.availableSignals.length : '—'}
          caption={summary ? `${summary.eventDataSummary.length} event types` : undefined}
        />
      </div>

      {unresolvedSource && (
        <p className="px-1 text-body-sm text-muted">
          This device has no cloud events yet, so the signal breakdown covers the whole
          vehicle.
        </p>
      )}

      <CollapsibleSection
        title="Available signals"
        count={summary?.availableSignals.length ?? '…'}
        defaultOpen
        actions={<SignalFilter value={filter} onChange={setFilter} />}
      >
        {error ? (
          <Problem message={error} />
        ) : isLoading ? (
          <p className="px-5 py-3 text-body-sm text-muted">Loading…</p>
        ) : (
          <SignalTable
            filter={filter}
            showFrom={isVehicle && !unresolvedSource && ctx.graph.devices.length > 0}
            rows={(summary?.signalDataSummary ?? []).map((s) => ({
              name: s.name,
              count: s.numberOfSignals,
              firstSeen: s.firstSeen,
              lastSeen: s.lastSeen,
              from: fromBySignal[s.name],
            }))}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Events"
        count={summary?.eventDataSummary.length ?? '…'}
        meta={
          error
            ? undefined
            : summary?.eventDataSummary.length
              ? `Last event ${relativeTime(
                  summary.eventDataSummary
                    .map((e) => e.lastSeen)
                    .reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)),
                )}`
              : 'This source reports no events'
        }
      >
        {error && <Problem message={error} />}
        {!error && (
          <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
            <span>Event</span>
            <span className="text-right">Count</span>
            <span>First seen</span>
            <span>Last seen</span>
          </div>
        )}
        {(error ? [] : (summary?.eventDataSummary ?? [])).map((e) => (
          <div
            key={e.name}
            className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm text-fg"
          >
            <span className="flex flex-col">
              <span className="font-medium text-ink">{humanizeSignal(e.name)}</span>
              <span className="font-mono text-code text-muted">{e.name}</span>
            </span>
            <span className="text-right">{e.numberOfEvents.toLocaleString('en-US')}</span>
            <span>{utcDate(e.firstSeen)}</span>
            <span>{relativeTime(e.lastSeen)}</span>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title="Data types"
        count={typeRows.length}
        meta="Cloud event types on this DID"
      >
        {fieldError(types.data?.errors, 'availableCloudEventTypes') && (
          <Problem
            message={fieldError(types.data?.errors, 'availableCloudEventTypes')!}
          />
        )}
        {types.error && <Problem message={types.error.message} />}
        <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
          <span>Type</span>
          <span className="text-right">Count</span>
          <span>First seen</span>
          <span>Last seen</span>
        </div>
        {typeRows.map((t) => (
          <div
            key={t.type}
            className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm text-fg"
          >
            <span className="font-mono text-code text-ink">{t.type}</span>
            <span className="text-right">{t.count.toLocaleString('en-US')}</span>
            <span>{utcDate(t.firstSeen)}</span>
            <FreshnessDot at={t.lastSeen} />
          </div>
        ))}
        {typeRows.length === 0 &&
          !types.error &&
          !fieldError(types.data?.errors, 'availableCloudEventTypes') && (
            <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
              No cloud events on this DID yet.
            </p>
          )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Latest payload"
        meta={latestType ? `${latestType} · ${relativeTime(latestAt)}` : undefined}
        actions={
          <Button variant="secondary" onClick={() => ctx.onBrowseRaw(subject.did)}>
            Browse cloud events
          </Button>
        }
      >
        {latest.error && <Problem message={latest.error.message} />}
        {latest.data?.data?.latestCloudEvent ? (
          <div className="px-4 pb-4">
            <JsonBlock value={latest.data.data.latestCloudEvent} maxHeight={300} />
          </div>
        ) : (
          !latest.error && (
            <p className="px-5 py-3 text-body-sm text-muted">
              No cloud event for this DID yet.
            </p>
          )
        )}
      </CollapsibleSection>

      <CollapsibleSection title={isVehicle ? 'Vehicle details' : 'Device details'}>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-6 pb-5 pt-1 md:grid-cols-2">
          {subject.details.map((d) => (
            <div
              key={d.label}
              className="flex flex-col gap-0.5 border-b border-outline pb-2.5"
            >
              <span className="text-label text-muted">{d.label}</span>
              <span
                className={
                  d.mono
                    ? 'break-all font-mono text-code text-fg'
                    : 'text-body-sm text-fg'
                }
              >
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};
