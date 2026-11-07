'use client';
import { FC, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { subjectLabel, type Subject } from '@/services/subjects/graph';
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
import { useFreshnessText } from '@/hooks/useFreshnessText';

type Types = {
  availableCloudEventTypes:
    { type: string; count: number; firstSeen: string; lastSeen: string }[] | null;
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
  const t = useTranslations('vehicles');
  const format = useFormatter();
  const { relativeTime, absoluteTime, utcDate } = useFreshnessText();
  const [filter, setFilter] = useState('');
  const { summary, error, isLoading, unresolvedSource, fromBySignal } = useDataSummary(
    subject,
    ctx,
  );
  const types = useSubjectQuery<Types>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(subject.fetchDid, subject.fetchFilter),
  });
  const latest = useSubjectQuery<Latest>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestCloudEventQuery(subject.fetchDid, { ...subject.fetchFilter }, false),
  });

  const latestAt =
    latest.data?.data?.latestCloudEvent?.header?.time ??
    ctx.freshness[subject.did]?.time ??
    null;
  const latestType =
    latest.data?.data?.latestCloudEvent?.header?.type ?? ctx.freshness[subject.did]?.type;
  const producer = latest.data?.data?.latestCloudEvent?.header?.producer;
  const producerSubject = ctx.graph.all.find((s) => s.did === producer);
  const producerLabel = producerSubject && subjectLabel(producerSubject, t);
  const typeRows = types.data?.data?.availableCloudEventTypes ?? [];
  const typesError =
    types.error?.message ?? fieldError(types.data?.errors, 'availableCloudEventTypes');
  const latestError =
    latest.error?.message ?? fieldError(latest.data?.errors, 'latestCloudEvent');
  const isVehicle = subject.kind === 'vehicle';
  // A device is the vehicle DID narrowed to its producer, not a DID of its own.
  const scope = subject.fetchFilter ? 'device' : 'did';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <StatCard
          label={t('summary.latestPayload')}
          className="col-span-2 md:col-span-1"
          value={
            <span className="inline-flex items-center gap-3">
              <span aria-hidden="true" className="inline-flex">
                <FreshnessDot at={latestAt} label={false} />
              </span>
              {latestAt ? relativeTime(latestAt) : '—'}
            </span>
          }
          caption={
            latestAt
              ? t('summary.latestCaption', {
                  time: absoluteTime(latestAt),
                  hasType: latestType ? 'yes' : 'no',
                  type: latestType ?? '',
                  hasProducer: producerLabel ? 'yes' : 'no',
                  producer: producerLabel ?? '',
                })
              : latestError
                ? t('summary.unavailable')
                : t('summary.noPayloadYet')
          }
        />
        <StatCard
          label={t('summary.firstSeen')}
          value={summary ? utcDate(summary.firstSeen) : '—'}
          caption={
            summary
              ? t('summary.daysOfData', {
                  count: daysBetween(summary.firstSeen, summary.lastSeen),
                })
              : undefined
          }
        />
        <StatCard
          label={t('summary.dataPoints')}
          value={summary ? compact(summary.numberOfSignals) : '—'}
          caption={
            summary
              ? t('summary.acrossSignals', { count: summary.availableSignals.length })
              : undefined
          }
        />
        <StatCard
          label={t('summary.signals')}
          value={summary ? summary.availableSignals.length : '—'}
          caption={
            summary
              ? t('summary.eventTypes', { count: summary.eventDataSummary.length })
              : undefined
          }
        />
      </div>

      {unresolvedSource && (
        <p className="px-1 text-body-sm text-muted">{t('summary.unresolvedSource')}</p>
      )}

      <CollapsibleSection
        title={t('summary.availableSignals')}
        count={summary?.availableSignals.length ?? '…'}
        defaultOpen
        actions={<SignalFilter value={filter} onChange={setFilter} />}
      >
        {error ? (
          <Problem message={error} />
        ) : isLoading ? (
          <p className="px-5 py-3 text-body-sm text-muted">{t('summary.loading')}</p>
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
        title={t('summary.events')}
        count={summary?.eventDataSummary.length ?? '…'}
        meta={
          error
            ? undefined
            : summary?.eventDataSummary.length
              ? t('summary.lastEvent', {
                  time: relativeTime(
                    summary.eventDataSummary
                      .map((e) => e.lastSeen)
                      .reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)),
                  ),
                })
              : t('summary.noEvents')
        }
      >
        {error && <Problem message={error} />}
        {!error && (
          <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
            <span>{t('summary.event')}</span>
            <span className="text-right">{t('summary.count')}</span>
            <span>{t('summary.firstSeen')}</span>
            <span>{t('summary.lastSeen')}</span>
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
            <span className="text-right">{format.number(e.numberOfEvents)}</span>
            <span>{utcDate(e.firstSeen)}</span>
            <span>{relativeTime(e.lastSeen)}</span>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('summary.dataTypes')}
        count={typeRows.length}
        meta={
          typesError ? t('summary.unavailable') : t('summary.cloudEventTypes', { scope })
        }
      >
        {typesError && <Problem message={typesError} />}
        <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
          <span>{t('summary.type')}</span>
          <span className="text-right">{t('summary.count')}</span>
          <span>{t('summary.firstSeen')}</span>
          <span>{t('summary.lastSeen')}</span>
        </div>
        {typeRows.map((row) => (
          <div
            key={row.type}
            className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm text-fg"
          >
            <span className="font-mono text-code text-ink">{row.type}</span>
            <span className="text-right">{format.number(row.count)}</span>
            <span>{utcDate(row.firstSeen)}</span>
            <FreshnessDot at={row.lastSeen} />
          </div>
        ))}
        {typeRows.length === 0 && !typesError && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            {t('summary.noCloudEvents', { scope })}
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('summary.latestPayload')}
        meta={
          latestError
            ? t('summary.unavailable')
            : latestType
              ? t('summary.latestMeta', {
                  type: latestType,
                  time: relativeTime(latestAt),
                })
              : undefined
        }
        actions={
          <Button variant="secondary" onClick={() => ctx.onBrowseRaw(subject.did)}>
            {t('summary.browseCloudEvents')}
          </Button>
        }
      >
        {latestError && <Problem message={latestError} />}
        {latest.data?.data?.latestCloudEvent ? (
          <div className="px-4 pb-4">
            <JsonBlock value={latest.data.data.latestCloudEvent} maxHeight={300} />
          </div>
        ) : (
          !latestError && (
            <p className="px-5 py-3 text-body-sm text-muted">
              {t('summary.noCloudEvent', { scope })}
            </p>
          )
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={isVehicle ? t('summary.vehicleDetails') : t('summary.deviceDetails')}
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-6 pb-5 pt-1 md:grid-cols-2">
          {subject.details.map((d) => (
            <div
              key={d.key}
              className="flex flex-col gap-0.5 border-b border-outline pb-2.5"
            >
              <span className="text-label text-muted">
                {t(`subjects.details.${d.key}`)}
              </span>
              <span
                className={
                  d.mono
                    ? 'break-all font-mono text-code text-fg'
                    : 'text-body-sm text-fg'
                }
              >
                {d.date ? utcDate(d.value) : (d.value ?? t('subjects.unknown'))}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};
