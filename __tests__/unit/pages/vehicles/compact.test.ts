import { compact } from '@/app/vehicles/[tokenId]/components/StatCard';

describe('compact', () => {
  it.each([
    [999, '999'],
    [1_000, '1K'],
    [999_999, '1M'],
    [1_240_000, '1.24M'],
    [10_000_000, '10M'],
  ])('%d -> %s', (n, expected) => {
    expect(compact(n)).toBe(expected);
  });
});
