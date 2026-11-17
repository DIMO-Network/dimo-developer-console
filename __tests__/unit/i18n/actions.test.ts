/**
 * @jest-environment node
 */
import { cookies } from 'next/headers';
import { setLocale } from '@/i18n/actions';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const set = jest.fn();

describe('setLocale', () => {
  beforeEach(() => {
    jest.mocked(cookies).mockResolvedValue({ set } as never);
  });

  it('stores a supported locale for a year, site-wide', async () => {
    await setLocale('zh-Hant');
    expect(set).toHaveBeenCalledWith('NEXT_LOCALE', 'zh-Hant', {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
  });

  // A Server Action is a public endpoint: the payload can be anything.
  it.each([['fr'], [42], [null], [{ toLowerCase: 'x' }], [['ja']]])(
    'ignores %j without throwing',
    async (payload) => {
      await expect(setLocale(payload as never)).resolves.toBeUndefined();
      expect(set).not.toHaveBeenCalled();
    },
  );
});
