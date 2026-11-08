import { getTranslations } from 'next-intl/server';
import { paginationSummary } from '@/components/Table/paginationSummary';

// Numbers inside a sentence are formatted for the locale by the message, not
// passed in as preformatted strings.
describe('numbers in messages', () => {
  it('groups the pagination counts', async () => {
    const t = await getTranslations('common');
    const { key, values } = paginationSummary(120, 10, 4321);
    expect(t(key, values)).toBe('Showing 1,201–1,210 of 4,321');
  });

  it('formats the DIMO a connection needs to two decimals', async () => {
    const t = await getTranslations('common');
    expect(t('transactions.insufficientDimo', { required: 1234.5, usd: 1 })).toBe(
      'Insufficient DIMO balance. You need at least 1,234.50 DIMO tokens (approximately $1) to mint a connection.',
    );
  });

  it('formats the chart range for screen readers', async () => {
    const t = await getTranslations('vehicles');
    expect(
      t('signals.chartDescription', { name: 'Speed', count: 2, min: 1200.5, max: 3 }),
    ).toBe('Speed, 2 points, 1,200.5–3');
  });
});
