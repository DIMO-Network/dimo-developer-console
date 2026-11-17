import { getTranslations } from 'next-intl/server';

describe('summary.latestCaption', () => {
  it.each([
    ['no', 'no', 'Mar 4, 2024, 10:00:00 UTC'],
    ['yes', 'no', 'Mar 4, 2024, 10:00:00 UTC · dimo.status'],
    ['no', 'yes', 'Mar 4, 2024, 10:00:00 UTC from AutoPi'],
    ['yes', 'yes', 'Mar 4, 2024, 10:00:00 UTC · dimo.status from AutoPi'],
  ])('type %s, producer %s: %s', async (hasType, hasProducer, caption) => {
    const t = await getTranslations('vehicles');
    expect(
      t('summary.latestCaption', {
        time: 'Mar 4, 2024, 10:00:00 UTC',
        hasType,
        type: 'dimo.status',
        hasProducer,
        producer: 'AutoPi',
      }),
    ).toBe(caption);
  });
});
