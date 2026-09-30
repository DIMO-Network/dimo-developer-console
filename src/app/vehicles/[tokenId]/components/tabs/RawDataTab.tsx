'use client';
import { FC, useMemo, useState } from 'react';
import classNames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  cloudEventsQuery,
  latestCloudEventQuery,
  indexesQuery,
  type CloudEventFilter,
  type GqlRequest,
} from '@/services/subjects/queries';
import {
  TimeRangePicker,
  resolveRange,
  type TimeRange,
} from '@/components/TimeRangePicker';
import { QueryActions } from '@/components/QueryActions';
import { JsonBlock } from '@/components/JsonBlock';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { shortDid } from '@/services/subjects/did';
import { absoluteTime } from '@/utils/freshness';

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
const KNOWN_TYPES = ['dimo.status', 'dimo.fingerprint', 'dimo.attestation', 'dimo.event'];
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
  const [before, setBefore] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number>(0);
  // The request only changes on Run query / Load older, so typing never refetches.
  const [request, setRequest] = useState<GqlRequest>(() =>
    build('events', subject.did, { after: range.from, before: range.to }, 25, false),
  );

  const run = (nextMode = mode, olderThan: string | null = null) => {
    const filter: CloudEventFilter = {
      type: form.type,
      dataversion: form.dataversion,
      id: form.id,
      source: form.source,
      producer: form.producer,
      after: range.from,
      before: olderThan ?? range.to,
    };
    setBefore(olderThan);
    setExpanded(0);
    setRequest(build(nextMode, subject.did, filter, form.limit, form.withUrl));
  };

  const q = useSubjectQuery<Result>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request,
    staleTime: 0,
  });
  const rows = useMemo<Event[]>(() => {
    const d = q.data?.data;
    if (!d) return [];
    if (mode === 'latest') return d.latestCloudEvent ? [d.latestCloudEvent] : [];
    if (mode === 'index') return d.indexes ?? [];
    return d.cloudEvents ?? [];
  }, [q.data, mode]);
  const producerLabel = (did: string) =>
    ctx.graph.all.find((s) => s.did === did)?.label ?? shortDid(did);
  const title =
    mode === 'latest'
      ? 'Latest cloud event'
      : `${rows.length} ${mode === 'index' ? 'index entries' : 'cloud events'}${before ? ' (older)' : ''}`;

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
              {KNOWN_TYPES.map((t) => (
                <option key={t} value={t} />
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
          <Button onClick={() => run()}>Run query</Button>
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
            result={q.data?.data}
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
        {q.isLoading && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            Loading…
          </p>
        )}
        {q.error && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
            {q.error.message}
          </p>
        )}
        {!q.isLoading && !q.error && rows.length === 0 && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            No events match. Widen the range or clear a filter.
          </p>
        )}
        {rows.map((r, i) => {
          const open = expanded === i;
          const [date, time] = [
            absoluteTime(r.header.time).split(',')[0],
            r.header.time.slice(11, 19),
          ];
          return (
            <div key={r.header.id + i} className="flex flex-col border-t border-outline">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? -1 : i)}
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
                  {r.dataUrl && (
                    <a
                      href={r.dataUrl}
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
        {mode !== 'latest' && rows.length > 0 && (
          <div className="flex justify-center border-t border-outline p-3">
            <Button
              variant="secondary"
              onClick={() => run(mode, rows[rows.length - 1].header.time)}
            >
              Load older
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
