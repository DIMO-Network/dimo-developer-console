import type { Locale } from './locale';

export const AREAS = [
  'common',
  'app',
  'connections',
  'configurator',
  'email-recovery',
  'license',
  'licenses',
  'settings',
  'sign-in',
  'sign-up',
  'support',
  'templates',
  'vehicles',
  'webhooks',
] as const;
export type Area = (typeof AREAS)[number];

const isMissingModule = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'MODULE_NOT_FOUND';

const loadArea = async (locale: Locale, area: Area): Promise<object> => {
  try {
    return (await import(`../../messages/${locale}/${area}.json`)).default;
  } catch (error) {
    if (isMissingModule(error)) return {};
    throw error;
  }
};

export const loadMessages = async (locale: Locale): Promise<Record<Area, object>> => {
  const entries = await Promise.all(
    AREAS.map(async (area) => [area, await loadArea(locale, area)] as const),
  );
  return Object.fromEntries(entries) as Record<Area, object>;
};
