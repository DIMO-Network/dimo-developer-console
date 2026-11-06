/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { cookies, headers } from 'next/headers';
import getRequestConfig from '@/i18n/request';

jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

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
    getRequestConfig as unknown as () => Promise<{ locale: string; messages: object }>
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
});
