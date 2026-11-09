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

// What each part of the app hands the browser. Every page gets common and the
// error page's copy; the guest pages add theirs and the signed-in pages add
// the rest, so sign-in doesn't download the console's copy.
export const ROOT_MESSAGES = ['common', 'app.error'];
export const GUEST_AREAS: Area[] = ['sign-in', 'sign-up', 'email-recovery'];
export const SIGNED_IN_AREAS: Area[] = AREAS.filter(
  (area) => area !== 'common' && !GUEST_AREAS.includes(area),
);

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

const pickPath = (messages: Messages, [key, ...rest]: string[]): Messages => {
  const value = messages[key];
  if (value === undefined) return {};
  if (rest.length === 0) return { [key]: value };
  if (!isTree(value)) return {};
  const picked = pickPath(value, rest);
  return Object.keys(picked).length ? { [key]: picked } : {};
};

// Paths are areas ('common') or subtrees of one ('app.error').
export const pickMessages = (messages: Messages, paths: readonly string[]): Messages =>
  paths.reduce<Messages>(
    (picked, path) => deepMerge(picked, pickPath(messages, path.split('.'))),
    {},
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
