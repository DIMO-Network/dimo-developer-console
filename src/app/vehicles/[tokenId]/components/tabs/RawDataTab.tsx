'use client';
import { FC, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import classNames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { useFormatter, useTranslations } from 'next-intl';
import { subjectLabel, type Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery, subjectQueryKey } from '@/hooks/subjects/useSubjectQuery';
import { fieldError, postSubjectQuery } from '@/services/subjects/client';
import {
  cloudEventsQuery,
  latestCloudEventQuery,
  indexesQuery,
  availableCloudEventTypesQuery,
  type CloudEventFilter,
  type GqlRequest,
} from '@/services/subjects/queries';
import {
  TimeRangePicker,
  resolveRange,
  isRangeValid,
  type TimeRange,
} from '@/components/TimeRangePicker';
import { QueryActions } from '@/components/QueryActions';
import { JsonBlock } from '@/components/JsonBlock';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { shortDid } from '@/services/subjects/did';
import { safeHttpUrl } from '@/utils/safeHttpUrl';

type Mode = 'events' | 'latest' | 'index';
type Scope = 'vehicle' | 'device';
type Header = {
  id: string;
  source: string;
  producer: string;
  subject: string;
  time: string;
  type: string;
  dataversion?: string;
  tags?: string[];
};
type Event = { header: Header; data?: unknown; dataUrl?: string; indexKey?: string };
type Result = {
  cloudEvents?: Event[] | null;
  latestCloudEvent?: Event | null;
  indexes?: Event[] | null;
  latestIndex?: Event | null;
};

const MODE_IDS: Mode[] = ['events', 'latest', 'index'];
const SCOPE_IDS: Scope[] = ['vehicle', 'device'];

function Pills<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onPick: (id: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onPick(o.id)}
          className={classNames(
            'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
            value === o.id ? 'bg-bright text-ink shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const build = (
  mode: Mode,
  did: string,
  filter: CloudEventFilter,
  limit: number,
  withUrl: boolean,
): GqlRequest => {
  if (mode === 'latest') return latestCloudEventQuery(did, filter, withUrl);
  if (mode === 'index') return indexesQuery(did, filter, limit);
  return cloudEventsQuery(did, filter, limit, withUrl);
};

type Spec = {
  mode: Mode;
  scope: Scope;
  filter: CloudEventFilter;
  limit: number;
  withUrl: boolean;
};

const ROOT: Record<Mode, keyof Result> = {
  events: 'cloudEvents',
  latest: 'latestCloudEvent',
  index: 'indexes',
};

const pageRows = (mode: Mode, d: Result | null | undefined): Event[] => {
  if (!d) return [];
  if (mode === 'latest') return d.latestCloudEvent ? [d.latestCloudEvent] : [];
  if (mode === 'index') return d.indexes ?? [];
  return d.cloudEvents ?? [];
};

export const RawDataTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const t = useTranslations('vehicles');
  const format = useFormatter();
  const modes = MODE_IDS.map((id) => ({ id, label: t(`raw.modes.${id}`) }));
  const scopes = SCOPE_IDS.map((id) => ({ id, label: t(`raw.scopes.${id}`) }));
  const [mode, setMode] = useState<Mode>('events');
  const [range, setRange] = useState<TimeRange>({ preset: '7d', ...resolveRange('7d') });
  const [form, setForm] = useState({
    type: '',
    dataversion: '',
    id: '',
    source: '',
    producer: '',
    limit: 25,
    withUrl: false,
  });
  const [more, setMore] = useState(false);
  // The spec only changes on Run query or a mode/scope change, so typing never refetches.
  const [spec, setSpec] = useState<Spec>(() => ({
    mode: 'events',
    scope: 'vehicle',
    filter: { after: range.from, before: range.to },
    limit: 25,
    withUrl: false,
  }));
  // Each Load older adds one `before` cursor; they reset whenever the spec changes.
  const [olderBefores, setOlderBefores] = useState<string[]>([]);
  // undefined = default (first row open), null = all closed, string = header.id
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const valid = isRangeValid(range);
  // A device's producer comes from the subject and always wins over the form.
  const lockedProducer = subject.fetchFilter?.producer;

  const run = (nextMode: Mode = mode, nextScope: Scope = spec.scope) => {
    let { from, to } = range;
    if (range.preset !== 'custom') {
      const r = resolveRange(range.preset);
      from = r.from;
      to = r.to;
      setRange({ preset: range.preset, ...r });
    }
    setOlderBefores([]);
    setExpanded(undefined);
    setSpec({
      mode: nextMode,
      scope: nextScope,
      filter: {
        type: form.type,
        dataversion: form.dataversion,
        id: form.id,
        source: form.source,
        producer: lockedProducer ? undefined : form.producer,
        after: from,
        before: to,
      },
      limit: form.limit,
      withUrl: form.withUrl,
    });
  };

  // Device status is filed under the device's own DID (subject = producer);
  // everything else a device sends is the vehicle DID narrowed to it.
  const own = spec.scope === 'device' ? subject.ownFetchDid : undefined;
  const fetchDid = own ?? subject.fetchDid;
  const fetchFilter = own ? undefined : subject.fetchFilter;

  const requests = useMemo(
    () =>
      [null, ...olderBefores].map((before) =>
        build(
          spec.mode,
          fetchDid,
          {
            ...spec.filter,
            ...(before ? { before } : {}),
            ...fetchFilter,
          },
          spec.limit,
          spec.withUrl,
        ),
      ),
    [spec, olderBefores, fetchDid, fetchFilter],
  );
  const pages = useQueries({
    queries: requests.map((req) => ({
      queryKey: [...subjectQueryKey('fetch', subject.asset, req), ctx.clientId],
      queryFn: () =>
        postSubjectQuery<Result>('fetch', {
          asset: subject.asset,
          clientId: ctx.clientId,
          request: req,
        }),
      enabled: !!ctx.clientId,
      staleTime: 0,
      retry: false,
    })),
  });
  const types = useSubjectQuery<{
    availableCloudEventTypes: { type: string }[] | null;
  }>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(fetchDid, fetchFilter),
  });
  const knownTypes = types.data?.data?.availableCloudEventTypes ?? [];

  // Flatten pages in order; the first occurrence of an id wins.
  const seen = new Set<string>();
  const rows: Event[] = [];
  let lastAdded = 0;
  pages.forEach((p, i) => {
    let added = 0;
    for (const r of pageRows(spec.mode, p.data?.data)) {
      if (seen.has(r.header.id)) continue;
      seen.add(r.header.id);
      rows.push(r);
      added++;
    }
    if (i === pages.length - 1) lastAdded = added;
  });

  const base = pages[0];
  const last = pages[pages.length - 1];
  const olderPage = pages.length > 1 ? last : null;
  const producerLabel = (did: string) => {
    const s = ctx.graph.all.find((s) => s.did === did);
    return s ? subjectLabel(s, t) : shortDid(did);
  };
  const title =
    spec.mode === 'latest'
      ? t('raw.latestTitle')
      : t(spec.mode === 'index' ? 'raw.indexTitle' : 'raw.eventsTitle', {
          count: rows.length,
        });
  // A page fails whole (thrown) or on its root field (partial data).
  const pageError = (p: (typeof pages)[number] | null) =>
    p ? (p.error?.message ?? fieldError(p.data?.errors, ROOT[spec.mode])) : null;
  const baseError = pageError(base);
  const olderError = pageError(olderPage);
  const olderLoaded = !!olderPage && !olderPage.isLoading && !olderError;
  const exhausted = olderLoaded && lastAdded === 0;
  const request = requests[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3.5 rounded-card bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {subject.ownFetchDid && (
              <Pills
                label={t('raw.scopeLabel')}
                options={scopes}
                value={spec.scope}
                onPick={(id) => run(mode, id)}
              />
            )}
            <Pills
              label={t('raw.queryLabel')}
              options={modes}
              value={mode}
              onPick={(id) => {
                setMode(id);
                run(id);
              }}
            />
          </div>
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            {t('raw.type')}
            <TextField
              list="cloud-event-types"
              wrapperClassName="w-44"
              value={form.type}
              placeholder={t('raw.anyType')}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <datalist id="cloud-event-types">
              {knownTypes.map((row) => (
                <option key={row.type} value={row.type} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            {t('raw.dataVersion')}
            <TextField
              wrapperClassName="w-36"
              value={form.dataversion}
              placeholder={t('raw.anyVersion')}
              onChange={(e) => setForm({ ...form, dataversion: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            {t('raw.limit')}
            <TextField
              type="number"
              min={1}
              max={100}
              wrapperClassName="w-20"
              value={form.limit}
              onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
            />
          </label>
          {lockedProducer && !own && (
            // The device's own filter: shown, never editable.
            <span className="flex h-10 items-center">
              <span
                className="rounded-chip bg-highest px-2 py-0.5 text-label text-fg"
                title={lockedProducer}
              >
                {t('raw.producer', { name: producerLabel(lockedProducer) })}
              </span>
            </span>
          )}
          <Button variant="ghost" onClick={() => setMore((m) => !m)}>
            {more ? t('raw.fewerFilters') : t('raw.moreFilters')}
          </Button>
          <label className="flex h-10 items-center gap-2 text-body-sm text-fg">
            <input
              type="checkbox"
              checked={form.withUrl}
              onChange={(e) => setForm({ ...form, withUrl: e.target.checked })}
              className="size-4 accent-accent"
            />
            {t('raw.includeDataUrl')}
          </label>
          <div className="grow" />
          <Button disabled={!valid} onClick={() => run()}>
            {t('raw.runQuery')}
          </Button>
        </div>
        {more && (
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              placeholder={t('raw.eventId')}
              aria-label={t('raw.eventId')}
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              wrapperClassName="w-56"
            />
            <TextField
              placeholder={t('raw.sourceAddress')}
              aria-label={t('raw.sourceLabel')}
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              wrapperClassName="w-72"
            />
            {!lockedProducer && (
              <TextField
                placeholder={t('raw.producerDid')}
                aria-label={t('raw.producerLabel')}
                value={form.producer}
                onChange={(e) => setForm({ ...form, producer: e.target.value })}
                wrapperClassName="w-96"
              />
            )}
          </div>
        )}
      </div>

      {subject.kind === 'vehicle' && (
        <p className="px-1 text-body-sm text-muted">{t('raw.vehicleHelp')}</p>
      )}
      {own && <p className="px-1 text-body-sm text-muted">{t('raw.deviceHelp')}</p>}

      <div className="flex flex-col rounded-card bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-card-title text-ink">{title}</span>
            <span className="truncate font-mono text-code text-muted">
              {shortDid(subject.did)}
            </span>
          </div>
          <QueryActions
            request={request}
            result={base.data?.data}
            filename={`${subject.fileStem}-${own ? 'device-status' : 'cloud-events'}.json`}
          />
        </div>
        <div className="grid grid-cols-[116px_minmax(0,1fr)_32px] md:grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
          <span>{t('raw.timeColumn')}</span>
          <span>{t('raw.type')}</span>
          <span className="hidden md:block">{t('raw.dataVersion')}</span>
          <span className="hidden md:block">{t('raw.producerLabel')}</span>
          <span />
        </div>
        {base.isLoading && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            {t('raw.loading')}
          </p>
        )}
        {baseError && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
            {baseError}
          </p>
        )}
        {!base.isLoading && !baseError && rows.length === 0 && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            {t('raw.noMatch')}
          </p>
        )}
        {rows.map((r, i) => {
          const open = expanded === undefined ? i === 0 : expanded === r.header.id;
          const payloadUrl = safeHttpUrl(r.dataUrl);
          const [date, time] = [
            format.dateTime(Date.parse(r.header.time), {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }),
            r.header.time.slice(11, 19),
          ];
          return (
            <div key={r.header.id + i} className="flex flex-col border-t border-outline">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : r.header.id)}
                className={classNames(
                  'grid grid-cols-[116px_minmax(0,1fr)_32px] md:grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] items-center gap-4 px-5 py-2.5 text-left transition-colors hover:bg-control',
                  open && 'bg-control',
                )}
              >
                <span className="text-body-sm text-fg">
                  <span className="text-muted">{date}</span> {time}
                </span>
                <span className="text-body-sm font-medium text-ink">{r.header.type}</span>
                <span className="hidden font-mono text-code text-fg md:block">
                  {r.header.dataversion ?? '—'}
                </span>
                <span className="hidden text-body-sm text-fg md:block">
                  {producerLabel(r.header.producer)}
                </span>
                <ChevronDownIcon
                  className={classNames(
                    'size-4 text-muted transition-transform',
                    open && 'rotate-180',
                  )}
                />
              </button>
              {open && (
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <JsonBlock value={r} maxHeight={260} />
                  {payloadUrl && (
                    <a
                      href={payloadUrl}
                      className="w-fit text-body-sm font-semibold text-ink underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('raw.downloadPayload')}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {spec.mode !== 'latest' && rows.length > 0 && (
          <div className="flex flex-col items-center gap-2 border-t border-outline p-3">
            {olderPage?.isLoading && (
              <p className="text-body-sm text-muted">{t('raw.loading')}</p>
            )}
            {olderError && <p className="text-body-sm text-negative">{olderError}</p>}
            {exhausted ? (
              <p className="text-body-sm text-muted">{t('raw.noOlder')}</p>
            ) : (
              <Button
                variant="secondary"
                disabled={!valid || !!olderPage?.isLoading}
                onClick={() =>
                  setOlderBefores((b) => [
                    ...b,
                    new Date(
                      Date.parse(rows[rows.length - 1].header.time) + 1,
                    ).toISOString(),
                  ])
                }
              >
                {t('raw.loadOlder')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
