'use client';
import { FC, useState } from 'react';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  segmentsQuery,
  dailyActivityQuery,
  SEGMENT_DEFAULTS,
  type DetectionMechanism,
  type SegmentConfig,
  type GqlRequest,
} from '@/services/subjects/queries';
import {
  TimeRangePicker,
  resolveRange,
  isRangeValid,
  type TimeRange,
} from '@/components/TimeRangePicker';
import { QueryActions } from '@/components/QueryActions';
import { fieldError } from '@/services/subjects/client';
import { Button } from '@/components/Button';
import { absoluteTime } from '@/utils/freshness';

const MECHANISMS: { value: DetectionMechanism; label: string; daily: boolean }[] = [
  { value: 'ignitionDetection', label: 'Ignition on and off', daily: true },
  { value: 'frequencyAnalysis', label: 'Signal frequency', daily: true },
  { value: 'changePointDetection', label: 'Change points', daily: true },
  { value: 'idling', label: 'Idling', daily: false },
  { value: 'refuel', label: 'Refueling', daily: false },
  { value: 'recharge', label: 'Recharging', daily: false },
];
const CONFIG_FIELDS: { key: keyof SegmentConfig; label: string }[] = [
  { key: 'maxGapSeconds', label: 'Max gap (seconds)' },
  { key: 'minSegmentDurationSeconds', label: 'Min duration (seconds)' },
  { key: 'signalCountThreshold', label: 'Signal count threshold' },
  { key: 'maxIdleRpm', label: 'Max idle rpm' },
  { key: 'minIncreasePercent', label: 'Min increase (%)' },
];
const inputClass =
  'h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink';

type Segment = {
  start: {
    timestamp: string;
    value: { latitude: number; longitude: number } | null;
  } | null;
  end: {
    timestamp: string;
    value: { latitude: number; longitude: number } | null;
  } | null;
  duration: number;
  isOngoing: boolean;
  startedBeforeRange: boolean;
  signals: { name: string; agg: string; value: number | null }[];
  eventCounts: { name: string; count: number }[];
};
type Day = { segmentCount: number; duration: number };

const MAX_RANGE_DAYS = 31;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// The API returns one record per calendar day, in order, starting at the UTC day of `from`.
const dayLabel = (from: string, i: number) => {
  const d = new Date(from);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + i);
  const day = new Date(t);
  return `${DAY_NAMES[day.getUTCDay()]} ${day.getUTCDate()}`;
};

export const fmtDuration = (seconds: number) => {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} m`;
};
const sig = (s: Segment, name: string, agg: string) =>
  s.signals.find((x) => x.name === name && x.agg === agg)?.value ?? null;
const distance = (s: Segment) => {
  const a = sig(s, 'powertrainTransmissionTravelledDistance', 'FIRST');
  const b = sig(s, 'powertrainTransmissionTravelledDistance', 'LAST');
  return a !== null && b !== null ? `${(b - a).toFixed(1)} km` : '—';
};
const short = (iso: string) => absoluteTime(iso).replace(/:\d\d UTC$/, '');

export const TripsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const tokenId = subject.tokenId ?? 0;
  const [mechanism, setMechanism] = useState<DetectionMechanism>('ignitionDetection');
  const [range, setRange] = useState<TimeRange>({ preset: '7d', ...resolveRange('7d') });
  const [config, setConfig] = useState<SegmentConfig>(SEGMENT_DEFAULTS);
  const [advanced, setAdvanced] = useState(false);
  const [segReq, setSegReq] = useState<GqlRequest | null>(null);
  const [dayReq, setDayReq] = useState<GqlRequest | null>(null);
  const [dayFrom, setDayFrom] = useState(range.from);
  const dailySupported = MECHANISMS.find((m) => m.value === mechanism)!.daily;

  const tooLong =
    Date.parse(range.to) - Date.parse(range.from) > MAX_RANGE_DAYS * 86_400_000;
  const canRun = isRangeValid(range) && !tooLong;

  const run = () => {
    let r = range;
    if (range.preset !== 'custom') {
      r = { preset: range.preset, ...resolveRange(range.preset) };
      setRange(r);
    }
    const base = { tokenId, from: r.from, to: r.to, mechanism, config };
    setDayFrom(r.from);
    setSegReq(segmentsQuery(base));
    setDayReq(dailySupported ? dailyActivityQuery(base) : null);
  };
  const segments = useSubjectQuery<{ segments: Segment[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: segReq,
    staleTime: 0,
  });
  const days = useSubjectQuery<{ dailyActivity: Day[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: dayReq,
    enabled: !!dayReq,
    staleTime: 0,
  });
  const dayRows = days.data?.data?.dailyActivity ?? [];
  const segRows = segments.data?.data?.segments ?? [];
  // A refused privilege arrives as a thrown GraphQL error or a field error.
  const dayError = days.error?.message ?? fieldError(days.data?.errors, 'dailyActivity');
  const segError =
    segments.error?.message ?? fieldError(segments.data?.errors, 'segments');
  const maxCount = Math.max(1, ...dayRows.map((d) => d.segmentCount));
  const totalTrips = dayRows.reduce((n, d) => n + d.segmentCount, 0);
  const totalSeconds = dayRows.reduce((n, d) => n + d.duration, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-card bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Detect trips by
            <select
              className={`${inputClass} appearance-none pr-8`}
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value as DetectionMechanism)}
            >
              {MECHANISMS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <TimeRangePicker value={range} onChange={setRange} maxDays={31} />
          <Button variant="ghost" onClick={() => setAdvanced((a) => !a)}>
            Advanced settings
          </Button>
          <div className="flex-grow" />
          <Button onClick={run} disabled={!canRun}>
            Run query
          </Button>
        </div>
        {tooLong && (
          <p className="text-label text-negative">Pick a range of 31 days or less.</p>
        )}
        {advanced && (
          <div className="flex flex-wrap items-end gap-3 border-t border-outline pt-3">
            {CONFIG_FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5 text-label text-muted">
                {f.label}
                <input
                  type="number"
                  className={`${inputClass} w-40`}
                  value={config[f.key] ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [f.key]: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
            <Button variant="ghost" onClick={() => setConfig(SEGMENT_DEFAULTS)}>
              Reset to defaults
            </Button>
          </div>
        )}
        {!dailySupported && (
          <p className="text-body-sm text-muted">
            Daily activity is available for ignition, frequency and change-point
            detection.
          </p>
        )}
      </div>

      {dayReq && (
        <div className="flex flex-col gap-4 rounded-card bg-card p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-card-title text-ink">Daily activity</span>
            {!dayError && (
              <span className="text-body-sm text-muted">
                {days.isLoading
                  ? 'Running…'
                  : `${totalTrips} trips · ${fmtDuration(totalSeconds)} driving`}
              </span>
            )}
          </div>
          {dayError && <p className="text-body-sm text-negative">{dayError}</p>}
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="Daily activity"
            tabIndex={0}
          >
            <div
              className="grid min-w-[560px] gap-3 md:min-w-0"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, dayRows.length)}, minmax(0, 1fr))`,
              }}
            >
              {dayRows.map((d, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex h-24 items-end">
                    <div
                      className="w-full rounded-t-md bg-chart-1"
                      style={{
                        height: `${Math.max(4, Math.round((d.segmentCount / maxCount) * 96))}px`,
                      }}
                    />
                  </div>
                  <span className="text-body-sm font-medium text-ink">
                    {dayLabel(dayFrom, i)}
                  </span>
                  <span className="text-label text-muted">
                    {d.segmentCount} trip{d.segmentCount === 1 ? '' : 's'} ·{' '}
                    {fmtDuration(d.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {segReq && (
        <div className="flex flex-col rounded-card bg-card">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-card-title text-ink">Trips</span>
            <QueryActions
              request={segReq}
              result={segments.data?.data}
              filename="trips.json"
            />
          </div>
          <div className="overflow-x-auto" role="region" aria-label="Trips" tabIndex={0}>
            <div className="min-w-[640px] md:min-w-0">
              <div className="grid grid-cols-6 gap-4 border-t border-outline px-5 py-2 text-label text-muted">
                <span>Started ↓</span>
                <span>Ended</span>
                <span className="text-right">Duration</span>
                <span className="text-right">Distance</span>
                <span className="text-right">Top speed</span>
                <span />
              </div>
              {segments.isLoading && (
                <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
                  Running…
                </p>
              )}
              {segError && (
                <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
                  {segError}
                </p>
              )}
              {segRows.map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 items-center gap-4 border-t border-outline px-5 py-3 text-body-sm text-fg"
                >
                  <span>{s.start ? short(s.start.timestamp) : '—'}</span>
                  <span>{s.isOngoing || !s.end ? 'Now' : short(s.end.timestamp)}</span>
                  <span className="text-right">{fmtDuration(s.duration)}</span>
                  <span className="text-right">{distance(s)}</span>
                  <span className="text-right">
                    {sig(s, 'speed', 'MAX') !== null
                      ? `${Math.round(sig(s, 'speed', 'MAX')!)} km/h`
                      : '—'}
                  </span>
                  <span className="flex justify-end">
                    {s.isOngoing && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-control px-2.5 py-0.5 text-label text-ink">
                        <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]" />
                        In progress
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {!segments.isLoading && !segError && segRows.length === 0 && (
                <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
                  No trips in this range.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
