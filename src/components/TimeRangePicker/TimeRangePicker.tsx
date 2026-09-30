'use client';
import { FC } from 'react';
import classNames from 'classnames';

export type RangePreset = '24h' | '7d' | '30d' | 'custom';
export type TimeRange = { preset: RangePreset; from: string; to: string };

const HOURS: Record<Exclude<RangePreset, 'custom'>, number> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
};
const LABELS: Record<RangePreset, string> = {
  '24h': '24 h',
  '7d': '7 days',
  '30d': '30 days',
  'custom': 'Custom',
};

export const resolveRange = (
  preset: Exclude<RangePreset, 'custom'>,
  now = Date.now(),
) => ({
  from: new Date(now - HOURS[preset] * 3_600_000).toISOString(),
  to: new Date(now).toISOString(),
});

// datetime-local wants "YYYY-MM-DDTHH:mm"; we keep everything UTC.
const toLocalInput = (iso: string) => iso.slice(0, 16);
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00.000Z`).toISOString() : '');

interface Props {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  maxDays?: number;
  now?: number;
}

export const TimeRangePicker: FC<Props> = ({ value, onChange, maxDays, now }) => {
  const presets = (Object.keys(LABELS) as RangePreset[]).filter(
    (p) => p === 'custom' || !maxDays || HOURS[p] / 24 <= maxDays,
  );
  const pick = (p: RangePreset) =>
    onChange(
      p === 'custom'
        ? { ...value, preset: 'custom' }
        : { preset: p, ...resolveRange(p, now) },
    );
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-muted">Range</span>
        <div
          role="radiogroup"
          aria-label="Range"
          className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
        >
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={value.preset === p}
              onClick={() => pick(p)}
              className={classNames(
                'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
                value.preset === p
                  ? 'bg-bright text-ink shadow-sm'
                  : 'text-muted hover:text-fg',
              )}
            >
              {LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {value.preset === 'custom' && (
        <>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            From (UTC)
            <input
              type="datetime-local"
              value={toLocalInput(value.from)}
              onChange={(e) =>
                onChange({ ...value, from: fromLocalInput(e.target.value) })
              }
              className="h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            To (UTC)
            <input
              type="datetime-local"
              value={toLocalInput(value.to)}
              onChange={(e) => onChange({ ...value, to: fromLocalInput(e.target.value) })}
              className="h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink"
            />
          </label>
        </>
      )}
    </div>
  );
};
