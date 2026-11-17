import { freshnessOf, relativeTimeParts, FRESHNESS_TONE } from '@/utils/freshness';

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

describe('relativeTimeParts', () => {
  it.each([
    [ago(20_000), { kind: 'justNow' }],
    [ago(2 * MIN), { kind: 'minutes', count: 2 }],
    [ago(3 * HOUR), { kind: 'hours', count: 3 }],
    [ago(14 * DAY), { kind: 'days', count: 14 }],
    [ago(70 * DAY), { kind: 'date', at: NOW - 70 * DAY }],
    [null, { kind: 'never' }],
  ])('%s → %j', (iso, expected) => {
    expect(relativeTimeParts(iso, NOW)).toEqual(expected);
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
