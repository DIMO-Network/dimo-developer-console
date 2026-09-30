'use client';
import { FC, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import classNames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery, subjectQueryKey } from '@/hooks/subjects/useSubjectQuery';
import { postSubjectQuery } from '@/services/subjects/client';
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
import { absoluteTime } from '@/utils/freshness';
import { safeHttpUrl } from '@/utils/safeHttpUrl';

type Mode = 'events' | 'latest' | 'index';
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

const MODES: { id: Mode; label: string }[] = [
  { id: 'events', label: 'Events' },
  { id: 'latest', label: 'Latest' },
  { id: 'index', label: 'Index only' },
];
const inputClass =
  'h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink';

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
  filter: CloudEventFilter;
  limit: number;
  withUrl: boolean;
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
  // The spec only changes on Run query / mode change, so typing never refetches.
  const [spec, setSpec] = useState<Spec>(() => ({
    mode: 'events',
    filter: { after: range.from, before: range.to },
    limit: 25,
    withUrl: false,
  }));
  // Each Load older adds one `before` cursor; they reset whenever the spec changes.
  const [olderBefores, setOlderBefores] = useState<string[]>([]);
  // undefined = default (first row open), null = all closed, string = header.id
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const valid = isRangeValid(range);

  const run = (nextMode: Mode = mode) => {
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
      filter: {
        type: form.type,
        dataversion: form.dataversion,
        id: form.id,
        source: form.source,
        producer: form.producer,
        after: from,
        before: to,
      },
      limit: form.limit,
      withUrl: form.withUrl,
    });
  };

  const requests = useMemo(
    () =>
      [null, ...olderBefores].map((before) =>
        build(
          spec.mode,
          subject.did,
          before ? { ...spec.filter, before } : spec.filter,
          spec.limit,
          spec.withUrl,
        ),
      ),
    [spec, olderBefores, subject.did],
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
    request: availableCloudEventTypesQuery(subject.did),
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
  const producerLabel = (did: string) =>
    ctx.graph.all.find((s) => s.did === did)?.label ?? shortDid(did);
  const title =
    spec.mode === 'latest'
      ? 'Latest cloud event'
      : `${rows.length} ${spec.mode === 'index' ? 'index entries' : 'cloud events'}`;
  const olderLoaded = !!olderPage && !olderPage.isLoading && !olderPage.error;
  const exhausted = olderLoaded && lastAdded === 0;
  const request = requests[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3.5 rounded-card bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="radiogroup"
            aria-label="Query"
            className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => {
                  setMode(m.id);
                  run(m.id);
                }}
                className={classNames(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
                  mode === m.id
                    ? 'bg-bright text-ink shadow-sm'
                    : 'text-muted hover:text-fg',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Type
            <input
              list="cloud-event-types"
              className={classNames(inputClass, 'w-44')}
              value={form.type}
              placeholder="Any type"
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <datalist id="cloud-event-types">
              {knownTypes.map((t) => (
                <option key={t.type} value={t.type} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Data version
            <input
              className={classNames(inputClass, 'w-36')}
              value={form.dataversion}
              placeholder="Any version"
              onChange={(e) => setForm({ ...form, dataversion: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Limit
            <input
              type="number"
              min={1}
              max={100}
              className={classNames(inputClass, 'w-20')}
              value={form.limit}
              onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
            />
          </label>
          <Button variant="ghost" onClick={() => setMore((m) => !m)}>
            {more ? 'Fewer filters' : 'More filters'}
          </Button>
          <label className="flex h-10 items-center gap-2 text-body-sm text-fg">
            <input
              type="checkbox"
              checked={form.withUrl}
              onChange={(e) => setForm({ ...form, withUrl: e.target.checked })}
              className="size-4 accent-accent"
            />
            Include data URL
          </label>
          <div className="flex-grow" />
          <Button disabled={!valid} onClick={() => run()}>
            Run query
          </Button>
        </div>
        {more && (
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              placeholder="Event ID"
              aria-label="Event ID"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              wrapperClassName="w-56"
            />
            <TextField
              placeholder="Source address"
              aria-label="Source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              wrapperClassName="w-72"
            />
            <TextField
              placeholder="Producer DID"
              aria-label="Producer"
              value={form.producer}
              onChange={(e) => setForm({ ...form, producer: e.target.value })}
              wrapperClassName="w-96"
            />
          </div>
        )}
      </div>

      {subject.kind === 'vehicle' && (
        <p className="px-1 text-body-sm text-muted">
          Cloud events for the vehicle DID from every device. Pick a device on the left to
          see only that device.
        </p>
      )}

      <div className="flex flex-col rounded-card bg-card">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-card-title text-ink">{title}</span>
            <span className="truncate font-mono text-code text-muted">
              {shortDid(subject.did)}
            </span>
          </div>
          <QueryActions
            request={request}
            result={base.data?.data}
            filename={`${subject.label.toLowerCase()}-cloud-events.json`}
          />
        </div>
        <div className="grid grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
          <span>Time (UTC) ↓</span>
          <span>Type</span>
          <span>Data version</span>
          <span>Producer</span>
          <span />
        </div>
        {base.isLoading && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            Loading…
          </p>
        )}
        {base.error && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
            {base.error.message}
          </p>
        )}
        {!base.isLoading && !base.error && rows.length === 0 && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            No events match. Widen the range or clear a filter.
          </p>
        )}
        {rows.map((r, i) => {
          const open = expanded === undefined ? i === 0 : expanded === r.header.id;
          const payloadUrl = safeHttpUrl(r.dataUrl);
          const [date, time] = [
            absoluteTime(r.header.time).split(',')[0],
            r.header.time.slice(11, 19),
          ];
          return (
            <div key={r.header.id + i} className="flex flex-col border-t border-outline">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : r.header.id)}
                className={classNames(
                  'grid grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] items-center gap-4 px-5 py-2.5 text-left transition-colors hover:bg-control',
                  open && 'bg-control',
                )}
              >
                <span className="text-body-sm text-fg">
                  <span className="text-muted">{date}</span> {time}
                </span>
                <span className="text-body-sm font-medium text-ink">{r.header.type}</span>
                <span className="font-mono text-code text-fg">
                  {r.header.dataversion ?? '—'}
                </span>
                <span className="text-body-sm text-fg">
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
                      Download payload
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {spec.mode !== 'latest' && rows.length > 0 && (
          <div className="flex flex-col items-center gap-2 border-t border-outline p-3">
            {olderPage?.isLoading && <p className="text-body-sm text-muted">Loading…</p>}
            {olderPage?.error && (
              <p className="text-body-sm text-negative">{olderPage.error.message}</p>
            )}
            {exhausted ? (
              <p className="text-body-sm text-muted">No older events.</p>
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
                Load older
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
