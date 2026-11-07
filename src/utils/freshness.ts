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

const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export type RelativeTimeParts =
  | { kind: 'never' }
  | { kind: 'justNow' }
  | { kind: 'minutes' | 'hours' | 'days'; count: number }
  | { kind: 'date'; at: number };

// The thresholds, shared by the English helper below and the translated hook.
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

// English only. Components use useFreshnessText, which translates; this stays
// for callers that have not moved to it.
export const relativeTime = (
  iso: string | null | undefined,
  now = Date.now(),
): string => {
  const parts = relativeTimeParts(iso, now);
  switch (parts.kind) {
    case 'never':
      return 'Never';
    case 'justNow':
      return 'just now';
    case 'minutes':
      return `${parts.count} min ago`;
    case 'hours':
      return `${parts.count} h ago`;
    case 'days':
      return `${parts.count} day${parts.count === 1 ? '' : 's'} ago`;
    case 'date':
      return dateLabel(parts.at);
  }
};

export const absoluteTime = (iso: string | null | undefined): string => {
  const t = parse(iso);
  if (t === null) return '';
  const d = new Date(t);
  return `${dateLabel(t)}, ${d.toISOString().slice(11, 19)} UTC`;
};

export const FRESHNESS_TONE: Record<Freshness, StatusTone> = {
  live: 'live',
  stale: 'pending',
  inactive: 'error',
  none: 'off',
};

// "Mar 4, 2024" in UTC; an em dash for a missing or invalid timestamp.
export const utcDate = (iso?: string | null): string => {
  const t = parse(iso);
  return t === null ? '—' : dateLabel(t);
};
