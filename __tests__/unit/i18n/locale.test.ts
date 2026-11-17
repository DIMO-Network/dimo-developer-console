/**
 * @jest-environment node
 */
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALES,
  localeFromAcceptLanguage,
  matchLocale,
  resolveLocale,
} from '@/i18n/locale';

describe('locale constants', () => {
  it('lists the supported locales, English first', () => {
    expect(LOCALES).toEqual(['en', 'es', 'ja', 'zh-Hans', 'zh-Hant']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LOCALE_COOKIE).toBe('NEXT_LOCALE');
  });

  it('labels every locale in its own language', () => {
    expect(LOCALE_LABELS).toEqual({
      'en': 'English',
      'es': 'Español',
      'ja': '日本語',
      'zh-Hans': '简体中文',
      'zh-Hant': '繁體中文',
    });
  });
});

describe('matchLocale', () => {
  it.each([
    ['zh', 'zh-Hans'],
    ['zh-CN', 'zh-Hans'],
    ['zh-SG', 'zh-Hans'],
    ['zh-Hans', 'zh-Hans'],
    ['zh-Hans-CN', 'zh-Hans'],
    ['zh-Hans-SG', 'zh-Hans'],
    ['zh_CN', 'zh-Hans'],
    ['ZH-cn', 'zh-Hans'],
    ['zh-TW', 'zh-Hant'],
    ['zh-HK', 'zh-Hant'],
    ['zh-MO', 'zh-Hant'],
    ['zh-Hant', 'zh-Hant'],
    ['zh-Hant-TW', 'zh-Hant'],
    ['zh-Hant-HK', 'zh-Hant'],
    ['zh_tw', 'zh-Hant'],
    ['ja', 'ja'],
    ['ja-JP', 'ja'],
    ['jp', 'ja'],
    ['JA', 'ja'],
    ['es', 'es'],
    ['es-ES', 'es'],
    ['es-419', 'es'],
    ['es_MX', 'es'],
    ['en', 'en'],
    ['en-US', 'en'],
    ['en-GB', 'en'],
    [' en-us ', 'en'],
  ])('%j is %s', (tag, expected) => {
    expect(matchLocale(tag)).toBe(expected);
  });

  it.each(['fr', 'de-DE', 'zh-yue', 'zh-Latn', 'jpn', 'english', 'e', '', '*'])(
    '%j is unsupported',
    (tag) => {
      expect(matchLocale(tag)).toBeUndefined();
    },
  );

  it('treats a missing tag as unsupported', () => {
    expect(matchLocale(undefined)).toBeUndefined();
    expect(matchLocale(null)).toBeUndefined();
  });
});

describe('localeFromAcceptLanguage', () => {
  it('maps the browser tag through the matching table', () => {
    expect(localeFromAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh-Hans');
  });

  it('picks the highest q-value, not the first listed', () => {
    expect(localeFromAcceptLanguage('en;q=0.5, ja;q=0.9')).toBe('ja');
  });

  it('skips unsupported tags for the next supported one', () => {
    expect(localeFromAcceptLanguage('fr-FR, fr;q=0.9, es;q=0.8, en;q=0.7')).toBe('es');
  });

  it('keeps header order between equal q-values', () => {
    expect(localeFromAcceptLanguage('ja, es')).toBe('ja');
    expect(localeFromAcceptLanguage('es;q=0.8, ja;q=0.8')).toBe('es');
  });

  it('ignores tags refused with q=0', () => {
    expect(localeFromAcceptLanguage('ja;q=0, es;q=0.1')).toBe('es');
  });

  it('is undefined when nothing is supported', () => {
    expect(localeFromAcceptLanguage('fr, de')).toBeUndefined();
    expect(localeFromAcceptLanguage('*')).toBeUndefined();
    expect(localeFromAcceptLanguage('')).toBeUndefined();
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
    expect(localeFromAcceptLanguage(undefined)).toBeUndefined();
  });
});

describe('resolveLocale', () => {
  it('falls back to Accept-Language when the cookie is unsupported', () => {
    expect(resolveLocale('fr', 'zh-TW')).toBe('zh-Hant');
  });

  it('defaults to English with neither', () => {
    expect(resolveLocale(null, null)).toBe('en');
    expect(resolveLocale(undefined, 'fr')).toBe('en');
  });

  it('prefers the cookie over Accept-Language', () => {
    expect(resolveLocale('ja', 'zh-CN')).toBe('ja');
  });

  it('normalizes the cookie through the matching table', () => {
    expect(resolveLocale('zh-hant', 'en')).toBe('zh-Hant');
  });
});
