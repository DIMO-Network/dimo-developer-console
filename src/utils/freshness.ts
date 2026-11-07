import type { StatusTone } from '@/components/StatusChip/StatusChip';

export type Freshness = 'live' | 'stale' | 'inactive' | 'none';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const parse = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

// <1h live, <24h stale, older inactive, missing none. Shared by every dot.
export const freshnessOf = (
  iso: string | null | undefined,
  now = Date.now(),
): Freshness => {
  const t = parse(iso);
  if (t === null) return 'none';
  const age = now - t;
  if (age < HOUR) return 'live';
  if (age < DAY) return 'stale';
  return 'inactive';
};

export type RelativeTimeParts =
  | { kind: 'never' }
  | { kind: 'justNow' }
  | { kind: 'minutes' | 'hours' | 'days'; count: number }
  | { kind: 'date'; at: number };

// The thresholds; useFreshnessText words them.
export const relativeTimeParts = (
  iso: string | null | undefined,
  now = Date.now(),
): RelativeTimeParts => {
  const t = parse(iso);
  if (t === null) return { kind: 'never' };
  const age = Math.max(0, now - t);
  if (age < MIN) return { kind: 'justNow' };
  if (age < HOUR) return { kind: 'minutes', count: Math.floor(age / MIN) };
  if (age < DAY) return { kind: 'hours', count: Math.floor(age / HOUR) };
  const days = Math.floor(age / DAY);
  if (days < 60) return { kind: 'days', count: days };
  return { kind: 'date', at: t };
};

export const FRESHNESS_TONE: Record<Freshness, StatusTone> = {
  live: 'live',
  stale: 'pending',
  inactive: 'error',
  none: 'off',
};
