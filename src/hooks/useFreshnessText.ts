import { useFormatter, useTranslations } from 'next-intl';
import { relativeTimeParts } from '@/utils/freshness';

// "Mar 4, 2024" is shown in UTC under every locale, like the English helpers
// in utils/freshness: the zone is part of what the label says.
const UTC_DATE = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
} as const;

const parse = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

export const useFreshnessText = () => {
  const t = useTranslations('common');
  const format = useFormatter();

  const utcDate = (iso?: string | null): string => {
    const at = parse(iso);
    return at === null ? t('freshness.noDate') : format.dateTime(at, UTC_DATE);
  };

  const relativeTime = (iso: string | null | undefined, now = Date.now()): string => {
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

  const absoluteTime = (iso: string | null | undefined): string => {
    const at = parse(iso);
    if (at === null) return '';
    return t('freshness.absolute', {
      date: format.dateTime(at, UTC_DATE),
      time: new Date(at).toISOString().slice(11, 19),
    });
  };

  return { relativeTime, absoluteTime, utcDate };
};
