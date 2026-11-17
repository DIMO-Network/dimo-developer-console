import { act, renderHook } from '@testing-library/react';
import { useFreshnessText, useUtcDate } from '@/hooks/useFreshnessText';

const NOW = Date.parse('2026-09-29T20:49:00Z');
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('useFreshnessText', () => {
  const run = () => renderHook(() => useFreshnessText()).result.current;

  it.each([
    [null, 'Never'],
    [new Date(NOW - 30_000).toISOString(), 'just now'],
    [new Date(NOW - MIN).toISOString(), '1 min ago'],
    [new Date(NOW - 5 * MIN).toISOString(), '5 min ago'],
    [new Date(NOW - 3 * HOUR).toISOString(), '3 h ago'],
    [new Date(NOW - DAY).toISOString(), '1 day ago'],
    [new Date(NOW - 12 * DAY).toISOString(), '12 days ago'],
    [new Date(NOW - 70 * DAY).toISOString(), 'Jul 21, 2026'],
    ['2024-03-04T23:30:00Z', 'Mar 4, 2024'],
  ])('says %s as "%s"', (iso, expected) => {
    expect(run().relativeTime(iso, NOW)).toBe(expected);
  });

  it('keeps UTC for the date, wherever the viewer is', () => {
    expect(run().utcDate('2024-03-04T23:30:00Z')).toBe('Mar 4, 2024');
    expect(run().utcDate(null)).toBe('—');
    expect(run().utcDate(undefined)).toBe('—');
    expect(run().utcDate('nope')).toBe('—');
  });

  it('spells out the absolute time in UTC', () => {
    expect(run().absoluteTime('2024-03-04T01:02:03Z')).toBe('Mar 4, 2024, 01:02:03 UTC');
    expect(run().absoluteTime(undefined)).toBe('');
  });

  describe('the shared minute clock', () => {
    const minuteIntervals = (spy: jest.SpyInstance) =>
      spy.mock.calls.filter(([, ms]) => ms === MIN).length;

    let setIntervalSpy: jest.SpyInstance;
    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
      setIntervalSpy = jest.spyOn(global, 'setInterval');
    });
    afterEach(() => {
      setIntervalSpy.mockRestore();
      jest.useRealTimers();
    });

    it('moves every label on each minute, on one interval for all of them', () => {
      const at = new Date(NOW - 5 * MIN).toISOString();
      const hooks = [1, 2, 3].map(() => renderHook(() => useFreshnessText()));
      hooks.forEach((h) => expect(h.result.current.relativeTime(at)).toBe('5 min ago'));
      expect(minuteIntervals(setIntervalSpy)).toBe(1);

      act(() => {
        jest.advanceTimersByTime(MIN);
      });
      hooks.forEach((h) => expect(h.result.current.relativeTime(at)).toBe('6 min ago'));
      expect(minuteIntervals(setIntervalSpy)).toBe(1);
    });

    it('stops when the last caller leaves and catches up when one returns', () => {
      const at = new Date(NOW - 5 * MIN).toISOString();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      try {
        renderHook(() => useFreshnessText()).unmount();
        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

        jest.setSystemTime(NOW + 10 * MIN);
        const { result } = renderHook(() => useFreshnessText());
        expect(result.current.relativeTime(at)).toBe('15 min ago');
      } finally {
        clearIntervalSpy.mockRestore();
      }
    });

    it('runs no clock for dates alone', () => {
      const { result } = renderHook(() => useUtcDate());
      expect(result.current.utcDate('2024-03-04T23:30:00Z')).toBe('Mar 4, 2024');
      expect(minuteIntervals(setIntervalSpy)).toBe(0);
    });
  });
});
