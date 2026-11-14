export const LOCALES = ['en', 'es', 'ja', 'zh-Hans', 'zh-Hant'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_LABELS: Record<Locale, string> = {
  'en': 'English',
  'es': 'Español',
  'ja': '日本語',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
};

const HANS = new Set(['zh', 'zh-cn', 'zh-sg', 'zh-hans']);
const HANT = new Set(['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant']);

const isOrUnder = (tag: string, base: string) =>
  tag === base || tag.startsWith(`${base}-`);

export const matchLocale = (tag?: string | null): Locale | undefined => {
  const normalized = tag?.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return undefined;
  if (HANS.has(normalized) || normalized.startsWith('zh-hans-')) return 'zh-Hans';
  if (HANT.has(normalized) || normalized.startsWith('zh-hant-')) return 'zh-Hant';
  if (isOrUnder(normalized, 'ja') || normalized === 'jp') return 'ja';
  if (isOrUnder(normalized, 'es')) return 'es';
  if (isOrUnder(normalized, 'en')) return 'en';
  return undefined;
};

const parseQuality = (params: string[]) => {
  const q = params.find((param) => param.trim().startsWith('q='));
  if (!q) return 1;
  const value = Number(q.trim().slice(2));
  return Number.isFinite(value) ? value : 0;
};

export const localeFromAcceptLanguage = (header?: string | null): Locale | undefined =>
  (header ?? '')
    .split(',')
    .map((entry) => {
      const [tag, ...params] = entry.split(';');
      return { tag, q: parseQuality(params) };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
    .map(({ tag }) => matchLocale(tag))
    .find((locale) => locale !== undefined);

export const resolveLocale = (
  cookie?: string | null,
  acceptLanguage?: string | null,
): Locale =>
  matchLocale(cookie) ?? localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
