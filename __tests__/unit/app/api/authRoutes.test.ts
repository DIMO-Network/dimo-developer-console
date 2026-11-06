/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { AxiosError, AxiosHeaders } from 'axios';

jest.mock('@/actions/dimoAuth', () => ({
  getDimoChallenge: jest.fn(),
  getDimoToken: jest.fn(),
}));
jest.mock('@/actions/user', () => ({ saveToken: jest.fn(), signOut: jest.fn() }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/utils/middlewareUtils', () => ({
  SESSION_VERDICT_COOKIE: 'session-verdict',
}));
const jar = { get: jest.fn(), delete: jest.fn() };
jest.mock('next/headers', () => ({ cookies: async () => jar }));

import * as Sentry from '@sentry/nextjs';
import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { saveToken, signOut } from '@/actions/user';
import config from '@/config';
import { POST as challenge } from '@/app/api/auth/challenge/route';
import { DELETE as withdraw, POST as session } from '@/app/api/auth/session/route';
import { POST as signout } from '@/app/api/auth/signout/route';
import { SESSION_VERDICT_COOKIE } from '@/utils/middlewareUtils';

const SITE = 'https://console.test';
const post = (
  path: string,
  body: unknown,
  {
    origin = SITE,
    method = 'POST',
    headers = {},
  }: { origin?: string | null; method?: string; headers?: Record<string, string> } = {},
) =>
  new NextRequest(`${SITE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'host': 'console.test',
      ...(origin ? { Origin: origin } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
const ADDRESS = '0x00000000000000000000000000000000000000bb';
const OTHER = '0x00000000000000000000000000000000000000cc';
beforeEach(() => {
  jar.get.mockReset();
  jar.delete.mockReset();
});
const dexAnswered = (status: number) =>
  new AxiosError('dex', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });
// A session cookie's token, as DIMO issues it (only its payload matters here).
const tokenFor = (wallet: string, sig = 'sig') =>
  `e30.${Buffer.from(JSON.stringify({ ethereum_address: wallet })).toString('base64url')}.${sig}`;
const fingerprint = (token: string) => createHash('sha256').update(token).digest('hex');

describe('origin check', () => {
  it.each([
    ['another site', { origin: 'https://evil.test' }],
    ['no Origin header', { origin: null }],
    ['a form post', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }],
    [
      'a simple request dressed as JSON',
      { headers: { 'Content-Type': 'text/plain; x=application/json' } },
    ],
  ])('refuses %s', async (_name, opts) => {
    const res = await challenge(post('/api/auth/challenge', { address: ADDRESS }, opts));
    expect(res.status).toBe(403);
    expect(getDimoChallenge).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the forwarded host',
      'https://console-alias.test',
      { 'x-forwarded-host': 'console-alias.test' },
    ],
    [
      'the first of a chain of forwarded hosts',
      'https://console-alias.test',
      { 'x-forwarded-host': 'console-alias.test, edge.vercel.test' },
    ],
    ['the configured public address', new URL(config.frontendUrl).origin, {}],
  ])('accepts %s', async (_name, origin, headers) => {
    (getDimoChallenge as jest.Mock).mockResolvedValue({ challenge: 'c', state: 's' });
    const res = await challenge(
      post('/api/auth/challenge', { address: ADDRESS }, { origin, headers }),
    );
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/challenge', () => {
  it("returns DIMO's challenge for the wallet, as the sign-in page asks for it", async () => {
    (getDimoChallenge as jest.Mock).mockResolvedValue({
      challenge: 'sign me',
      state: 's1',
    });
    const res = await challenge(post('/api/auth/challenge', { address: ADDRESS }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ challenge: 'sign me', state: 's1' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(getDimoChallenge).toHaveBeenCalledWith({
      address: ADDRESS,
      clientId: 'developer-platform',
      domain: `${config.frontendUrl}sign-in`,
    });
  });

  it('refuses anything but a wallet address', async () => {
    const res = await challenge(post('/api/auth/challenge', { address: 'nope' }));
    expect(res.status).toBe(400);
    expect(getDimoChallenge).not.toHaveBeenCalled();
  });

  it('answers 502, and reports it, when DIMO auth fails', async () => {
    (getDimoChallenge as jest.Mock).mockRejectedValue(dexAnswered(503));
    const res = await challenge(post('/api/auth/challenge', { address: ADDRESS }));
    expect(res.status).toBe(502);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/session', () => {
  const body = { state: 's1', signedChallenge: '0xsigned', sessionSeconds: 1800 };

  it('trades the signed challenge for a token and keeps it in the session cookie only', async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: 'jwt-1' });
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(200);
    // The token's fingerprint, for taking the cookie back; never the token.
    await expect(res.json()).resolves.toEqual({ ok: true, cookie: fingerprint('jwt-1') });
    expect(getDimoToken).toHaveBeenCalledWith({
      state: 's1',
      signedChallenge: '0xsigned',
      clientId: 'developer-platform',
      domain: `${config.frontendUrl}sign-in`,
    });
    expect(saveToken).toHaveBeenCalledWith('jwt-1', 1800);
  });

  it('lets the cookie last what the session key has left', async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: 'jwt-1' });
    const res = await session(
      post('/api/auth/session', { ...body, sessionSeconds: 600 }),
    );
    expect(res.status).toBe(200);
    expect(saveToken).toHaveBeenCalledWith('jwt-1', 600);
  });

  it("doesn't replace another account's cookie (it signed in meanwhile)", async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: tokenFor(ADDRESS) });
    jar.get.mockReturnValue({ value: tokenFor(OTHER) });
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ code: 'SIGNED_IN_ELSEWHERE' });
    expect(saveToken).not.toHaveBeenCalled();
  });

  it("replaces the wallet's own cookie", async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: tokenFor(ADDRESS) });
    jar.get.mockReturnValue({ value: tokenFor(ADDRESS) });
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(200);
    expect(saveToken).toHaveBeenCalledWith(tokenFor(ADDRESS), 1800);
  });

  it.each([
    ['a longer session', { ...body, sessionSeconds: 1801 }],
    ['no time left', { ...body, sessionSeconds: 0 }],
    ['a fractional length', { ...body, sessionSeconds: 1.5 }],
    ['no signature', { ...body, signedChallenge: '' }],
    ['no state', { ...body, state: undefined }],
  ])('refuses %s', async (_name, payload) => {
    const res = await session(post('/api/auth/session', payload));
    expect(res.status).toBe(400);
    expect(saveToken).not.toHaveBeenCalled();
  });

  it('answers 400, unreported and with no cookie, when DIMO auth refuses the signature', async () => {
    (getDimoToken as jest.Mock).mockRejectedValue(dexAnswered(400));
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(400);
    expect(saveToken).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('answers 502 with no cookie when DIMO auth fails', async () => {
    (getDimoToken as jest.Mock).mockRejectedValue(dexAnswered(500));
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(502);
    expect(saveToken).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/auth/session', () => {
  const del = (cookie: unknown) =>
    withdraw(post('/api/auth/session', { cookie }, { method: 'DELETE' }));
  const mine = tokenFor(ADDRESS);

  it('takes back the exact session cookie it names', async () => {
    jar.get.mockReturnValue({ value: mine });
    const res = await del(fingerprint(mine));
    await expect(res.json()).resolves.toEqual({ cleared: true });
    expect(jar.delete).toHaveBeenCalledWith('session-token');
    expect(jar.delete).toHaveBeenCalledWith(SESSION_VERDICT_COOKIE);
  });

  it.each([
    ['another account', tokenFor(OTHER)],
    ['the same account, signed in again', tokenFor(ADDRESS, 'newer')],
  ])('keeps a cookie a sign-in of %s set since', async (_name, since) => {
    jar.get.mockReturnValue({ value: since });
    const res = await del(fingerprint(mine));
    await expect(res.json()).resolves.toEqual({ cleared: false });
    expect(jar.delete).not.toHaveBeenCalled();
  });

  it('does nothing without a cookie', async () => {
    jar.get.mockReturnValue(undefined);
    await expect((await del(fingerprint(mine))).json()).resolves.toEqual({
      cleared: false,
    });
    expect(jar.delete).not.toHaveBeenCalled();
  });

  it("refuses another site, and anything but a cookie's fingerprint", async () => {
    jar.get.mockReturnValue({ value: mine });
    const crossSite = await withdraw(
      post(
        '/api/auth/session',
        { cookie: fingerprint(mine) },
        { method: 'DELETE', origin: 'https://evil.test' },
      ),
    );
    expect(crossSite.status).toBe(403);
    expect((await del('nope')).status).toBe(400);
    expect((await del(ADDRESS)).status).toBe(400);
    expect(jar.delete).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/signout', () => {
  it('runs the full sign-out, with or without a session cookie', async () => {
    const res = await signout(post('/api/auth/signout', {}));
    expect(res.status).toBe(200);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('refuses another site', async () => {
    const res = await signout(
      post('/api/auth/signout', {}, { origin: 'https://evil.test' }),
    );
    expect(res.status).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
  });
});
