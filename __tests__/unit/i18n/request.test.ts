/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { cookies, headers } from 'next/headers';
import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import getRequestConfig from '@/i18n/request';

jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

// Japanese has no files yet; each test supplies the Japanese catalogue it needs.
let mockJapanese: Record<string, object> = {};
jest.mock('@/i18n/messages', () => {
  const actual = jest.requireActual('@/i18n/messages');
  return {
    ...actual,
    loadMessages: async (locale: string) =>
      locale === 'ja' ? mockJapanese : actual.loadMessages(locale),
  };
});

const request = (cookie: string | undefined, acceptLanguage: string | null) => {
  jest.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === 'NEXT_LOCALE' && cookie ? { value: cookie } : undefined,
  } as never);
  jest
    .mocked(headers)
    .mockResolvedValue(
      new Headers(acceptLanguage ? { 'accept-language': acceptLanguage } : {}) as never,
    );
  return (
    getRequestConfig as unknown as () => Promise<{
      locale: string;
      messages: AbstractIntlMessages;
    }>
  )();
};

describe('i18n request config', () => {
  it('uses the NEXT_LOCALE cookie first', async () => {
    expect((await request('zh-Hant', 'ja')).locale).toBe('zh-Hant');
  });

  it('falls back to Accept-Language, then English', async () => {
    expect((await request(undefined, 'es-MX,es;q=0.9')).locale).toBe('es');
    expect((await request('fr', 'de')).locale).toBe('en');
  });

  it('loads that locale’s messages by area', async () => {
    const { messages } = await request(undefined, null);
    expect(messages).toMatchObject({
      common: JSON.parse(
        readFileSync(join(process.cwd(), 'messages', 'en', 'common.json'), 'utf8'),
      ),
    });
  });

  describe('English fallback', () => {
    const label = async () => {
      const { locale, messages } = await request('ja', null);
      return createTranslator({ locale, messages, namespace: 'common' })(
        'languageSwitcher.label',
      );
    };

    it('shows English for a key the locale is missing', async () => {
      mockJapanese = { common: { languageSwitcher: {} } };
      expect(await label()).toBe('Language');
    });

    it('keeps the translation of a key the locale has', async () => {
      mockJapanese = { common: { languageSwitcher: { label: '言語' } } };
      expect(await label()).toBe('言語');
    });
  });

  describe('in production', () => {
    const env = process.env;
    afterEach(() => {
      process.env = env;
    });

    it("builds each locale's catalog once and reuses it", async () => {
      process.env = { ...env, NODE_ENV: 'production' };
      mockJapanese = { common: { languageSwitcher: { label: '言語' } } };
      // A fresh registry, so the module-level cache starts empty; the mocks are
      // taken from inside it, as the isolated request.ts sees them.
      await jest.isolateModulesAsync(async () => {
        const nextHeaders = await import('next/headers');
        jest.mocked(nextHeaders.cookies).mockResolvedValue({
          get: () => ({ value: 'ja' }),
        } as never);
        jest.mocked(nextHeaders.headers).mockResolvedValue(new Headers() as never);
        // The module object request.ts calls into, not an import() wrapper.
        const messages =
          jest.requireMock<typeof import('@/i18n/messages')>('@/i18n/messages');
        const load = jest.spyOn(messages, 'loadMessages');
        const isolated = (await import('@/i18n/request'))
          .default as unknown as () => Promise<{
          messages: AbstractIntlMessages;
        }>;

        const first = await isolated();
        const second = await isolated();
        expect(second.messages).toBe(first.messages);
        // English once and Japanese once, for both requests.
        expect(load.mock.calls.map(([locale]) => locale).sort()).toEqual(['en', 'ja']);
        expect(
          createTranslator({
            locale: 'ja',
            messages: first.messages,
            namespace: 'common',
          })('languageSwitcher.label'),
        ).toBe('言語');
      });
    });
  });
});
