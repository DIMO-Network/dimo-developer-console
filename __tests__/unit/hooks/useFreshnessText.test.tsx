import { renderHook } from '@testing-library/react';
import { useFreshnessText } from '@/hooks/useFreshnessText';

const NOW = Date.parse('2026-09-29T20:49:00Z');
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('useFreshnessText', () => {
  const run = () => renderHook(() => useFreshnessText()).result.current;

  it.each([
    [null, 'Never'],
    [new Date(NOW - 30_000).toISOString(), 'just now'],
    [new Date(NOW - 5 * MIN).toISOString(), '5 min ago'],
    [new Date(NOW - 3 * HOUR).toISOString(), '3 h ago'],
    [new Date(NOW - DAY).toISOString(), '1 day ago'],
    [new Date(NOW - 12 * DAY).toISOString(), '12 days ago'],
    ['2024-03-04T23:30:00Z', 'Mar 4, 2024'],
  ])('says %s as "%s"', (iso, expected) => {
    expect(run().relativeTime(iso, NOW)).toBe(expected);
  });

  it('keeps UTC for the date, wherever the viewer is', () => {
    expect(run().utcDate('2024-03-04T23:30:00Z')).toBe('Mar 4, 2024');
    expect(run().utcDate(null)).toBe('—');
  });

  it('spells out the absolute time in UTC', () => {
    expect(run().absoluteTime('2024-03-04T01:02:03Z')).toBe('Mar 4, 2024, 01:02:03 UTC');
    expect(run().absoluteTime(undefined)).toBe('');
  });
});
