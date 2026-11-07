'use client';
import { FC, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { isDevice, type Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { useTelemetrySource } from '@/hooks/subjects/useDataSummary';
import { fieldError } from '@/services/subjects/client';
import {
  availableSignalsQuery,
  signalsQuery,
  signalsLatestQuery,
  isLocationSignal,
  isStringSignal,
  type FloatAggregation,
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
import { NativeSelect } from '@/components/NativeSelect';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { SignalPicker } from './SignalPicker';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { useFreshnessText } from '@/hooks/useFreshnessText';

const SignalChart = dynamic(() => import('./SignalChart').then((m) => m.SignalChart), {
  ssr: false,
});

const AGGS: FloatAggregation[] = ['AVG', 'MED', 'MAX', 'MIN', 'FIRST', 'LAST'];
const INTERVALS = ['5m', '15m', '1h', '24h'];

type Row = { timestamp: string } & Record<string, number | string | null>;
type Latest = {
  signalsLatest:
    | ({ lastSeen: string | null } & Record<
        string,
        { timestamp: string; value: unknown } | null
      >)
    | null;
};

export const SignalsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const t = useTranslations('vehicles');
  const tCommon = useTranslations('common');
  const { relativeTime } = useFreshnessText();
  const source = useTelemetrySource(subject, ctx);
  const tokenId = subject.tokenId ?? 0;
  const avail = useSubjectQuery<{ availableSignals: string[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableSignalsQuery(tokenId, source),
  });
  // Latest values reads every non-location signal; the chart only takes the
  // float ones (text signals have no float aggregation).
  const readable = useMemo(
    () => (avail.data?.data?.availableSignals ?? []).filter((s) => !isLocationSignal(s)),
    [avail.data],
  );
  const available = useMemo(() => readable.filter((s) => !isStringSignal(s)), [readable]);
  const availError =
    avail.error?.message ?? fieldError(avail.data?.errors, 'availableSignals');

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (!avail.data) return;
    setSelected((cur) => {
      const next = cur.filter((s) => available.includes(s));
      return next.length === cur.length ? cur : next;
    });
  }, [available, avail.data]);
  const [agg, setAgg] = useState<FloatAggregation>('AVG');
  const [interval, setInterval] = useState('1h');
  const [range, setRange] = useState<TimeRange>({ preset: '7d', ...resolveRange('7d') });
  const [view, setView] = useState<'chart' | 'json'>('chart');
  const [request, setRequest] = useState<GqlRequest | null>(null);
  const [latestRequest, setLatestRequest] = useState<GqlRequest | null>(null);

  const [ran, setRan] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const run = () => {
    // Presets are relative to now: re-resolve so "Last 7 days" isn't stale.
    const r =
      range.preset === 'custom'
        ? range
        : { preset: range.preset, ...resolveRange(range.preset) };
    if (r !== range) setRange(r);
    setRunError(null);
    const chosen = selected.filter((s) => !isLocationSignal(s));
    try {
      setRequest(
        signalsQuery({
          tokenId,
          signals: chosen,
          available,
          agg,
          interval,
          from: r.from,
          to: r.to,
          source,
        }),
      );
      setRan(chosen);
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      setRequest(null);
      setRan([]);
      setRunError(e.message);
    }
  };
  const series = useSubjectQuery<{ signals: Row[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request,
    staleTime: 0,
  });
  const latest = useSubjectQuery<Latest>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestRequest,
    staleTime: 0,
  });
  const rows = series.data?.data?.signals ?? [];

  return (
    <div className="flex flex-col gap-3">
      {isDevice(subject) && !source && (
        <p className="px-1 text-body-sm text-muted">{t('signals.unresolvedSource')}</p>
      )}
      <div className="flex flex-col gap-3.5 rounded-card bg-card p-4">
        <SignalPicker
          available={available}
          selected={selected}
          onChange={setSelected}
          loading={avail.isLoading}
          empty={!avail.isLoading && !availError && available.length === 0}
        />
        {availError && <p className="text-body-sm text-negative">{availError}</p>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            {t('signals.aggregation')}
            <NativeSelect
              value={agg}
              onChange={(e) => setAgg(e.target.value as FloatAggregation)}
            >
              {AGGS.map((a) => (
                <option key={a} value={a}>
                  {t(`signals.aggregations.${a}`)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            {t('signals.interval')}
            <NativeSelect value={interval} onChange={(e) => setInterval(e.target.value)}>
              {INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {t(`signals.intervals.${i}`)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <TimeRangePicker value={range} onChange={setRange} />
          <div className="grow" />
          <Button
            variant="ghost"
            onClick={() =>
              setLatestRequest(
                readable.length ? signalsLatestQuery(tokenId, readable, source) : null,
              )
            }
            disabled={!readable.length}
          >
            {t('signals.latestValues')}
          </Button>
          <Button onClick={run} disabled={selected.length === 0 || !isRangeValid(range)}>
            {t('signals.runQuery')}
          </Button>
        </div>
      </div>

      {runError && <p className="px-1 text-body-sm text-negative">{runError}</p>}

      {request && (
        <div className="flex flex-col rounded-card bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div
              role="radiogroup"
              aria-label={t('signals.resultView')}
              className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
            >
              {(['chart', 'json'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={classNames(
                    'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
                    view === v
                      ? 'bg-bright text-ink shadow-sm'
                      : 'text-muted hover:text-fg',
                  )}
                >
                  {v === 'chart' ? t('signals.chart') : t('signals.json')}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-label text-muted">
                {series.isLoading
                  ? t('signals.running')
                  : t('signals.points', { count: rows.length })}
              </span>
              <QueryActions
                request={request}
                result={series.data?.data}
                filename={`${subject.label.toLowerCase()}-signals.json`}
              />
            </div>
          </div>
          {series.error && (
            <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
              {series.error.message}
            </p>
          )}
          {series.data?.errors?.map((e) => (
            <p
              key={e.message}
              className="border-t border-outline px-5 py-3 text-body-sm text-negative"
            >
              {e.message}
            </p>
          ))}
          {view === 'chart' ? (
            <div className="flex flex-col gap-5 px-5 pb-5">
              {!series.isLoading && !series.error && rows.length === 0 && (
                <p className="text-body-sm text-muted">{t('signals.noPoints')}</p>
              )}
              {ran.map((name, i) => (
                <SignalChart
                  key={name}
                  name={name}
                  colorIndex={i}
                  points={rows.map((r) => ({
                    t: r.timestamp,
                    v: typeof r[name] === 'number' ? (r[name] as number) : null,
                  }))}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 pb-4">
              <JsonBlock value={series.data?.data ?? null} maxHeight={520} />
            </div>
          )}
        </div>
      )}

      {latestRequest && (
        <CollapsibleSection
          title={t('signals.latestValues')}
          defaultOpen
          meta={
            latest.data?.data?.signalsLatest?.lastSeen
              ? t('signals.lastSeen', {
                  time: relativeTime(latest.data.data.signalsLatest.lastSeen),
                })
              : undefined
          }
          actions={
            <QueryActions
              request={latestRequest}
              result={latest.data?.data}
              filename={`${subject.label.toLowerCase()}-latest.json`}
            />
          }
        >
          {(latest.error || fieldError(latest.data?.errors, 'signalsLatest')) && (
            <p className="px-5 py-3 text-body-sm text-negative">
              {latest.error?.message ?? fieldError(latest.data?.errors, 'signalsLatest')}
            </p>
          )}
          {Object.entries(latest.data?.data?.signalsLatest ?? {})
            .filter(([k, v]) => k !== 'lastSeen' && v)
            .map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-ink">
                    {humanizeSignal(k, tCommon)}
                  </span>
                  <span className="font-mono text-code text-muted">{k}</span>
                </span>
                <span className="font-mono text-code text-fg">
                  {(v as { value: unknown }).value == null
                    ? '\u2014'
                    : typeof (v as { value: unknown }).value === 'object'
                      ? JSON.stringify((v as { value: unknown }).value)
                      : String((v as { value: unknown }).value)}
                </span>
                <span className="text-muted">
                  {relativeTime((v as { timestamp: string }).timestamp)}
                </span>
              </div>
            ))}
        </CollapsibleSection>
      )}
    </div>
  );
};
