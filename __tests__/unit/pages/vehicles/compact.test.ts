import { createFormatter } from 'next-intl';
import { compact } from '@/app/vehicles/[tokenId]/components/StatCard';

describe('compact', () => {
  const format = createFormatter({ locale: 'en' });
  it.each([
    [999, '999'],
    [1_000, '1K'],
    [12_345, '12.3K'],
    [999_999, '1M'],
    [1_240_000, '1.24M'],
    [10_000_000, '10M'],
  ])('%d -> %s', (n, expected) => {
    expect(format.number(n, compact(n))).toBe(expected);
  });

  it('uses the locale units', () => {
    expect(createFormatter({ locale: 'ja' }).number(12_345, compact(12_345))).toBe(
      '1.2万',
    );
  });
});
