'use client';
import { FC, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
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
import { NativeSelect } from '@/components/NativeSelect';
import { TextField } from '@/components/TextField';
import type { Translate } from '@/i18n/translate';

const MECHANISMS: { value: DetectionMechanism; daily: boolean }[] = [
  { value: 'ignitionDetection', daily: true },
  { value: 'frequencyAnalysis', daily: true },
  { value: 'changePointDetection', daily: true },
  { value: 'idling', daily: false },
  { value: 'refuel', daily: false },
  { value: 'recharge', daily: false },
];
const CONFIG_KEYS: (keyof SegmentConfig)[] = [
  'maxGapSeconds',
  'minSegmentDurationSeconds',
  'signalCountThreshold',
  'maxIdleRpm',
  'minIncreasePercent',
];

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

// The API returns one record per calendar day, in order, starting at the UTC day of `from`.
const dayOf = (from: string, i: number) => {
  const d = new Date(from);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + i));
};

export const fmtDuration = (seconds: number, t: Translate) => {
  const m = Math.round(seconds / 60);
  if (m < 60) return t('trips.durationMinutes', { minutes: m });
  return t('trips.durationHours', {
    hours: Math.floor(m / 60),
    minutes: String(m % 60).padStart(2, '0'),
  });
};
const sig = (s: Segment, name: string, agg: string) =>
  s.signals.find((x) => x.name === name && x.agg === agg)?.value ?? null;
const distance = (s: Segment, t: Translate) => {
  const a = sig(s, 'powertrainTransmissionTravelledDistance', 'FIRST');
  const b = sig(s, 'powertrainTransmissionTravelledDistance', 'LAST');
  return a !== null && b !== null
    ? t('trips.distanceKm', { distance: (b - a).toFixed(1) })
    : '—';
};

export const TripsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const t = useTranslations('vehicles');
  const format = useFormatter();
  // "Tue 29", in UTC.
  const dayLabel = (from: string, i: number) => {
    const day = dayOf(from, i);
    return t('trips.day', {
      weekday: format.dateTime(day, { weekday: 'short', timeZone: 'UTC' }),
      day: day.getUTCDate(),
    });
  };
  // "Mar 4, 2024, 10:00" in UTC.
  const short = (iso: string) =>
    format.dateTime(Date.parse(iso), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
    });
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
            {t('trips.detectBy')}
            <NativeSelect
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value as DetectionMechanism)}
            >
              {MECHANISMS.map((m) => (
                <option key={m.value} value={m.value}>
                  {t(`trips.mechanisms.${m.value}`)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <TimeRangePicker value={range} onChange={setRange} maxDays={31} />
          <Button variant="ghost" onClick={() => setAdvanced((a) => !a)}>
            {t('trips.advanced')}
          </Button>
          <div className="grow" />
          <Button onClick={run} disabled={!canRun}>
            {t('trips.runQuery')}
          </Button>
        </div>
        {tooLong && <p className="text-label text-negative">{t('trips.tooLong')}</p>}
        {advanced && (
          <div className="flex flex-wrap items-end gap-3 border-t border-outline pt-3">
            {CONFIG_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1.5 text-label text-muted">
                {t(`trips.config.${key}`)}
                <TextField
                  type="number"
                  wrapperClassName="w-40"
                  value={config[key] ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [key]: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
            <Button variant="ghost" onClick={() => setConfig(SEGMENT_DEFAULTS)}>
              {t('trips.resetDefaults')}
            </Button>
          </div>
        )}
        {!dailySupported && (
          <p className="text-body-sm text-muted">{t('trips.dailyUnsupported')}</p>
        )}
      </div>

      {dayReq && (
        <div className="flex flex-col gap-4 rounded-card bg-card p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-card-title text-ink">{t('trips.dailyActivity')}</span>
            {!dayError && (
              <span className="text-body-sm text-muted">
                {days.isLoading
                  ? t('trips.running')
                  : t('trips.dailyTotals', {
                      count: totalTrips,
                      duration: fmtDuration(totalSeconds, t),
                    })}
              </span>
            )}
          </div>
          {dayError && <p className="text-body-sm text-negative">{dayError}</p>}
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={t('trips.dailyActivity')}
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
                    {t('trips.dayCaption', {
                      count: d.segmentCount,
                      duration: fmtDuration(d.duration, t),
                    })}
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
            <span className="text-card-title text-ink">{t('trips.trips')}</span>
            <QueryActions
              request={segReq}
              result={segments.data?.data}
              filename="trips.json"
            />
          </div>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={t('trips.trips')}
            tabIndex={0}
          >
            <div className="min-w-[640px] md:min-w-0">
              <div className="grid grid-cols-6 gap-4 border-t border-outline px-5 py-2 text-label text-muted">
                <span>{t('trips.started')}</span>
                <span>{t('trips.ended')}</span>
                <span className="text-right">{t('trips.duration')}</span>
                <span className="text-right">{t('trips.distance')}</span>
                <span className="text-right">{t('trips.topSpeed')}</span>
                <span />
              </div>
              {segments.isLoading && (
                <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
                  {t('trips.running')}
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
                  <span>
                    {s.isOngoing || !s.end ? t('trips.now') : short(s.end.timestamp)}
                  </span>
                  <span className="text-right">{fmtDuration(s.duration, t)}</span>
                  <span className="text-right">{distance(s, t)}</span>
                  <span className="text-right">
                    {sig(s, 'speed', 'MAX') !== null
                      ? t('trips.speedKmh', {
                          speed: Math.round(sig(s, 'speed', 'MAX')!),
                        })
                      : '—'}
                  </span>
                  <span className="flex justify-end">
                    {s.isOngoing && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-control px-2.5 py-0.5 text-label text-ink">
                        <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]" />
                        {t('trips.inProgress')}
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {!segments.isLoading && !segError && segRows.length === 0 && (
                <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
                  {t('trips.noTrips')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
