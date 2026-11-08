import { renderHook } from '@testing-library/react';
import { useTickFormat } from '@/app/vehicles/[tokenId]/components/tabs/SignalChart';

const H = 3_600_000;

describe('useTickFormat', () => {
  const formatTick = (iso: string, spanMs: number) =>
    renderHook(() => useTickFormat()).result.current(iso, spanMs);

  it('includes the UTC time on ranges under 48 hours', () => {
    expect(formatTick('2026-09-29T14:00:00Z', 24 * H)).toBe('Tue 29 14:00');
    expect(formatTick('2026-09-29T02:05:00Z', 24 * H)).toBe('Tue 29 02:05');
  });
  it('uses weekday and day on longer ranges', () => {
    expect(formatTick('2026-09-29T14:00:00Z', 7 * 24 * H)).toBe('Tue 29');
  });
});
