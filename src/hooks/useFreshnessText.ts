import { useFormatter, useTranslations } from 'next-intl';
import { parseIsoTime, relativeTimeParts } from '@/utils/freshness';
import { useMinuteClock } from '@/hooks/useMinuteClock';

// "Mar 4, 2024" is shown in UTC under every locale: the zone is part of what
// the label says.
const UTC_DATE = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
} as const;

/**
 * Dates that don't move: no clock, so a caller that only shows dates doesn't
 * re-render every minute.
 */
export const useUtcDate = () => {
  const t = useTranslations('common');
  const format = useFormatter();

  const utcDate = (iso?: string | null): string => {
    const at = parseIsoTime(iso);
    return at === null ? t('freshness.noDate') : format.dateTime(at, UTC_DATE);
  };

  const absoluteTime = (iso: string | null | undefined): string => {
    const at = parseIsoTime(iso);
    if (at === null) return '';
    return t('freshness.absolute', {
      date: format.dateTime(at, UTC_DATE),
      time: new Date(at).toISOString().slice(11, 19),
    });
  };

  return { utcDate, absoluteTime };
};

/** useUtcDate plus "5 min ago", which re-renders once a minute on the shared clock. */
export const useFreshnessText = () => {
  const t = useTranslations('common');
  const format = useFormatter();
  const { utcDate, absoluteTime } = useUtcDate();
  const clock = useMinuteClock();

  const relativeTime = (iso: string | null | undefined, now = clock): string => {
    const parts = relativeTimeParts(iso, now);
    switch (parts.kind) {
      case 'never':
        return t('freshness.never');
      case 'justNow':
        return t('freshness.justNow');
      case 'minutes':
        return t('freshness.minutesAgo', { count: parts.count });
      case 'hours':
        return t('freshness.hoursAgo', { count: parts.count });
      case 'days':
        return t('freshness.daysAgo', { count: parts.count });
      case 'date':
        return format.dateTime(parts.at, UTC_DATE);
    }
  };

  return { relativeTime, absoluteTime, utcDate };
};
