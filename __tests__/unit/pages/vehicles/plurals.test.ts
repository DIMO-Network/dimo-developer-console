import { getTranslations } from 'next-intl/server';

// These counts used to be plural whatever the number; one of each reads singular now.
describe('vehicles plurals', () => {
  it.each([
    ['raw.indexTitle', {}, '1 index entry'],
    ['raw.eventsTitle', {}, '1 cloud event'],
    ['signals.points', {}, '1 point'],
    ['summary.daysOfData', {}, '1 day of data'],
    ['trips.dayCaption', { duration: '12 min' }, '1 trip · 12 min'],
  ])('%s', async (key, values, text) => {
    const t = await getTranslations('vehicles');
    expect(t(key, { count: 1, ...values })).toBe(text);
    expect(t(key, { count: 2, ...values })).not.toBe(text);
  });
});
