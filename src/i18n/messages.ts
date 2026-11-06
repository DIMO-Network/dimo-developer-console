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

type Messages = { [key: string]: unknown };

const isTree = (value: unknown): value is Messages =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The override's values win; the base fills whatever the override lacks.
export const deepMerge = (base: Messages, override: Messages): Messages =>
  Object.entries(override).reduce<Messages>(
    (merged, [key, value]) => ({
      ...merged,
      [key]: isTree(value) && isTree(merged[key]) ? deepMerge(merged[key], value) : value,
    }),
    { ...base },
  );

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
