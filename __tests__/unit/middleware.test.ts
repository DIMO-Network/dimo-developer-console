/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { AxiosError } from 'axios';

const cookieJar: Record<string, string> = {};

jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  flush: jest.fn(async () => true),
  wrapMiddlewareWithSentry: (handler: unknown) => handler,
}));
jest.mock('@/services/dimoDevAPI', () => ({
  cookieName: 'session-token',
  getCookie: jest.fn(async (name: string) => cookieJar[name] ?? ''),
}));
jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
jest.mock('@/utils/middlewareUtils', () => ({
  ...jest.requireActual('@/utils/middlewareUtils'),
  decodeJwtToken: jest.fn(),
}));

import { config, proxy } from '@/proxy';
import * as Sentry from '@sentry/nextjs';
import { getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';
import {
  decodeJwtToken,
  SESSION_VERDICT_COOKIE,
  sessionVerdictFor,
} from '@/utils/middlewareUtils';

const TOKEN = 'header.payload.signature';
const compliantUser = {
  email: 'dev@dimo.test',
  name: 'Dev',
  team: { id: 't1' },
  role: 'OWNER',
};
const subOrganization = { subOrganizationId: 'sub-1', hasPasskey: true };

const request = (
  path: string,
  cookies: Record<string, string> = {},
  init: { method?: string; headers?: Record<string, string> } = {},
) => {
  Object.keys(cookieJar).forEach((k) => delete cookieJar[k]);
  Object.assign(cookieJar, cookies);
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return new NextRequest(`https://console.test${path}`, {
    method: init.method,
    headers: { ...(cookie ? { cookie } : {}), ...init.headers },
  });
};

const waitUntil = jest.fn();
const run = (req: NextRequest) =>
  proxy(req as unknown as Parameters<typeof proxy>[0], { waitUntil } as never);

const isPassThrough = (res: Response) => res.headers.get('x-middleware-next') === '1';

beforeEach(() => {
  (decodeJwtToken as jest.Mock).mockResolvedValue({ sub: 'user' });
  (getUserByToken as jest.Mock).mockResolvedValue(compliantUser);
  (getUserSubOrganization as jest.Mock).mockResolvedValue(subOrganization);
});

describe('proxy without a session', () => {
  it('sends pages to sign in', async () => {
    const res = await run(request('/licenses'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://console.test/sign-in');
  });

  // A 307 would replay the POST at /sign-in, where the proxy lets it through
  // and console-api answers 401 (reported as `POST /sign-in`).
  it('answers a server action without a session with 401 instead of replaying it at sign-in', async () => {
    const res = await run(
      request(
        '/connections',
        {},
        { method: 'POST', headers: { 'next-action': 'abc123' } },
      ),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('location')).toBeNull();
    await expect(res.json()).resolves.toEqual({
      error: 'Your session has expired',
      code: 'SESSION_EXPIRED',
      message: 'Unauthorized Access',
    });
  });

  it('clears the session cookies when it refuses an action for an invalid token', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(
      Object.assign(new Error('"exp" claim timestamp check failed'), {
        code: 'ERR_JWT_EXPIRED',
      }),
    );
    const res = await run(
      request(
        '/connections',
        { 'session-token': TOKEN, [SESSION_VERDICT_COOKIE]: 'v' },
        { method: 'POST', headers: { 'next-action': 'abc123' } },
      ),
    );
    expect(res.status).toBe(401);
    const cookies = (
      res as unknown as {
        cookies: { get: (n: string) => { value: string; expires?: Date } | undefined };
      }
    ).cookies;
    for (const name of ['session-token', SESSION_VERDICT_COOKIE]) {
      const cookie = cookies.get(name);
      expect(cookie?.value).toBe('');
      expect(cookie?.expires?.getTime()).toBe(0);
    }
  });

  // A key set that could not be fetched says nothing about the token: a brief JWKS
  // outage must not sign everyone out.
  it('keeps the session cookies when it refuses an action because the key set is down', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));
    const res = await run(
      request(
        '/connections',
        { 'session-token': TOKEN, [SESSION_VERDICT_COOKIE]: 'v' },
        { method: 'POST', headers: { 'next-action': 'abc123' } },
      ),
    );
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('lets a server action on the sign-in page run without a session', async () => {
    const res = await run(
      request('/sign-in', {}, { method: 'POST', headers: { 'next-action': 'abc123' } }),
    );
    expect(isPassThrough(res)).toBe(true);
    expect(res.status).not.toBe(401);
    expect(res.headers.get('location')).toBeNull();
  });

  it('answers protected API calls with 401', async () => {
    const res = await run(request('/api/webhook'));
    expect(res.status).toBe(401);
  });

  // The vehicle page reads `code` to say the session ended; older readers
  // still read `message`.
  it('tells API callers the session has expired, and keeps message', async () => {
    const res = await run(request('/api/data/telemetry'));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Your session has expired',
      code: 'SESSION_EXPIRED',
      message: 'Unauthorized Access',
    });
  });

  it('treats an expired token as signed out instead of failing', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(
      Object.assign(new Error('"exp" claim timestamp check failed'), {
        code: 'ERR_JWT_EXPIRED',
      }),
    );
    const res = await run(request('/licenses', { 'session-token': TOKEN }));
    expect(res.headers.get('location')).toBe('https://console.test/sign-in');
    expect(getUserByToken).not.toHaveBeenCalled();
  });
});

describe('proxy with a session', () => {
  it('checks onboarding once, then remembers the verdict for this token', async () => {
    const res = await run(request('/licenses', { 'session-token': TOKEN }));
    expect(isPassThrough(res)).toBe(true);
    expect(getUserByToken).toHaveBeenCalledTimes(1);
    expect(getUserSubOrganization).toHaveBeenCalledTimes(1);
    const set = (
      res as unknown as {
        cookies: {
          get: (n: string) => { value: string; maxAge: number; httpOnly: boolean };
        };
      }
    ).cookies.get(SESSION_VERDICT_COOKIE);
    expect(set.value).toBe(await sessionVerdictFor(TOKEN));
    expect(set.httpOnly).toBe(true);
    expect(set.maxAge).toBe(15 * 60);
  });

  it('skips both lookups when the verdict matches the token', async () => {
    const verdict = await sessionVerdictFor(TOKEN);
    const res = await run(
      request('/licenses', { 'session-token': TOKEN, [SESSION_VERDICT_COOKIE]: verdict }),
    );
    expect(isPassThrough(res)).toBe(true);
    expect(getUserByToken).not.toHaveBeenCalled();
    expect(getUserSubOrganization).not.toHaveBeenCalled();
  });

  it('still sends a remembered session away from the sign-in page', async () => {
    const verdict = await sessionVerdictFor(TOKEN);
    const res = await run(
      request('/sign-in', { 'session-token': TOKEN, [SESSION_VERDICT_COOKIE]: verdict }),
    );
    expect(res.headers.get('location')).toBe('https://console.test/app');
    expect(getUserByToken).not.toHaveBeenCalled();
  });

  it('ignores a verdict issued for another token', async () => {
    const verdict = await sessionVerdictFor('another.session.token');
    await run(
      request('/licenses', { 'session-token': TOKEN, [SESSION_VERDICT_COOKIE]: verdict }),
    );
    expect(getUserByToken).toHaveBeenCalledTimes(1);
  });

  it('lets a verified session reach the data proxy without the onboarding check', async () => {
    const res = await run(request('/api/data/telemetry', { 'session-token': TOKEN }));
    expect(isPassThrough(res)).toBe(true);
    expect(getUserByToken).not.toHaveBeenCalled();
  });

  it('refuses the data proxy to a token that does not verify', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(
      Object.assign(new Error('unsupported "crit" header'), {
        code: 'ERR_JOSE_NOT_SUPPORTED',
      }),
    );
    const res = await run(request('/api/data/telemetry', { 'session-token': TOKEN }));
    expect(res.status).toBe(401);
  });

  it('sends an unfinished account to its onboarding step and remembers nothing', async () => {
    (getUserByToken as jest.Mock).mockResolvedValue({ ...compliantUser, team: null });
    const res = await run(request('/licenses', { 'session-token': TOKEN }));
    expect(res.headers.get('location')).toBe(
      'https://console.test/sign-up?flow=build-for',
    );
    expect(res.headers.get('set-cookie') ?? '').not.toContain(SESSION_VERDICT_COOKIE);
  });

  it('lets an unfinished account through while it is on an onboarding flow', async () => {
    (getUserByToken as jest.Mock).mockResolvedValue({ ...compliantUser, team: null });
    const res = await run(request('/sign-up?flow=build-for', { 'session-token': TOKEN }));
    expect(isPassThrough(res)).toBe(true);
  });

  it('turns a failed lookup into the error redirect rather than an unhandled rejection', async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));
    const res = await run(request('/licenses', { 'session-token': TOKEN }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/app\?error=true$/);
  });

  it('gives up on the account lookup after 25 seconds, as Edge did', async () => {
    await run(request('/licenses', { 'session-token': TOKEN }));
    expect(getUserSubOrganization).toHaveBeenCalledWith(compliantUser.email, {
      timeout: 25_000,
    });
  });

  it('stays alive until Sentry has sent what it captured', async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));
    await run(request('/licenses', { 'session-token': TOKEN }));
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.flush).toHaveBeenCalledWith(2000);
    expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });
});

describe('proxy never lets an unverified token through', () => {
  const post = (path: string, cookies: Record<string, string>) => {
    Object.keys(cookieJar).forEach((k) => delete cookieJar[k]);
    Object.assign(cookieJar, cookies);
    const cookie = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    return new NextRequest(`https://console.test${path}`, {
      method: 'POST',
      headers: { cookie },
    });
  };

  // jose throws ERR_JOSE_NOT_SUPPORTED for a forged token with an unknown
  // "crit" header; with ?error= set, the error branch lets requests continue.
  it('rejects a forged token that makes verification throw an unexpected error', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Extension Header Parameter "x" is not recognized'), {
        code: 'ERR_JOSE_NOT_SUPPORTED',
      }),
    );
    const res = await run(post('/api/webhook?error=1', { 'session-token': TOKEN }));
    expect(res.status).toBe(401);
    expect(isPassThrough(res)).toBe(false);
  });

  it('does not report a crafted token to Sentry, only a key set it could not check', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(
      Object.assign(new Error('crit'), { code: 'ERR_JOSE_NOT_SUPPORTED' }),
    );
    await run(request('/licenses', { 'session-token': TOKEN }));
    expect(Sentry.captureException).not.toHaveBeenCalled();

    (decodeJwtToken as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));
    await run(request('/licenses', { 'session-token': TOKEN }));
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('treats a key set outage as signed out, not as a pass', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(new Error('fetch failed'));
    const page = await run(request('/licenses?error=1', { 'session-token': TOKEN }));
    expect(page.headers.get('location')).toMatch(/\/sign-in(\?|$)/);
    const api = await run(post('/api/webhook?error=1', { 'session-token': TOKEN }));
    expect(api.status).toBe(401);
  });

  it('still lets a verified session past a failed lookup on an ?error= page', async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));
    const res = await run(request('/app?error=true', { 'session-token': TOKEN }));
    expect(isPassThrough(res)).toBe(true);
  });
});

describe('proxy matcher', () => {
  const runsOn = (path: string) =>
    config.matcher.some((m) => new RegExp(`^${m}$`).test(path));

  it('skips the app icon and static assets', () => {
    expect(runsOn('/icon.png')).toBe(false);
    expect(runsOn('/icon.pngs/anything')).toBe(true);
    expect(runsOn('/_next/static/chunks/main.js')).toBe(false);
  });

  // A session-expired dialog signs in again through these with no cookie; the
  // routes check the origin themselves.
  it('skips /api/auth, and only it', () => {
    expect(runsOn('/api/auth/challenge')).toBe(false);
    expect(runsOn('/api/auth/session')).toBe(false);
    expect(runsOn('/api/me')).toBe(true);
    expect(runsOn('/api/teams')).toBe(true);
  });

  it('runs on routes whose last segment looks like a file name', () => {
    expect(runsOn('/api/templates/toyota.png')).toBe(true);
    expect(runsOn('/api/webhook')).toBe(true);
    expect(runsOn('/license/1/details')).toBe(true);
  });
});
