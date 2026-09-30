import { freshnessOf, relativeTime, utcDate, FRESHNESS_TONE } from '@/utils/freshness';

const NOW = Date.parse('2026-09-29T20:49:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('freshnessOf', () => {
  it.each([
    [ago(2 * MIN), 'live'],
    [ago(59 * MIN), 'live'],
    [ago(HOUR), 'stale'],
    [ago(23 * HOUR), 'stale'],
    [ago(DAY), 'inactive'],
    [ago(40 * DAY), 'inactive'],
    [null, 'none'],
    [undefined, 'none'],
    ['not a date', 'none'],
  ])('%s → %s', (iso, expected) => {
    expect(freshnessOf(iso, NOW)).toBe(expected);
  });
});

describe('relativeTime', () => {
  it.each([
    [ago(20_000), 'just now'],
    [ago(2 * MIN), '2 min ago'],
    [ago(1 * MIN), '1 min ago'],
    [ago(3 * HOUR), '3 h ago'],
    [ago(1 * DAY), '1 day ago'],
    [ago(14 * DAY), '14 days ago'],
    [ago(70 * DAY), 'Jul 21, 2026'],
    [null, 'Never'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTime(iso, NOW)).toBe(expected);
  });
});

it('maps freshness to StatusChip tones', () => {
  expect(FRESHNESS_TONE).toEqual({
    live: 'live',
    stale: 'pending',
    inactive: 'error',
    none: 'off',
  });
});

it('formats UTC dates and dashes missing or invalid input', () => {
  expect(utcDate('2024-03-04T00:00:00Z')).toBe('Mar 4, 2024');
  expect(utcDate(null)).toBe('—');
  expect(utcDate(undefined)).toBe('—');
  expect(utcDate('nope')).toBe('—');
});
