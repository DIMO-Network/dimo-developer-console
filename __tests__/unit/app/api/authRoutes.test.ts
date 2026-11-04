/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/actions/dimoAuth', () => ({
  getDimoChallenge: jest.fn(),
  getDimoToken: jest.fn(),
}));
jest.mock('@/actions/user', () => ({ saveToken: jest.fn() }));

import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { saveToken } from '@/actions/user';
import config from '@/config';
import { POST as challenge } from '@/app/api/auth/challenge/route';
import { POST as session } from '@/app/api/auth/session/route';

const SITE = 'https://console.test';
const post = (path: string, body: unknown, origin: string | null = SITE) =>
  new NextRequest(`${SITE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
const ADDRESS = '0x00000000000000000000000000000000000000bb';

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

  it.each([
    ['another site', 'https://evil.test'],
    ['no Origin header', null],
  ])('refuses a request from %s', async (_name, origin) => {
    const res = await challenge(
      post('/api/auth/challenge', { address: ADDRESS }, origin),
    );
    expect(res.status).toBe(403);
    expect(getDimoChallenge).not.toHaveBeenCalled();
  });

  it('refuses anything but a wallet address', async () => {
    const res = await challenge(post('/api/auth/challenge', { address: 'nope' }));
    expect(res.status).toBe(400);
    expect(getDimoChallenge).not.toHaveBeenCalled();
  });

  it('answers 502 when DIMO auth fails', async () => {
    (getDimoChallenge as jest.Mock).mockRejectedValue(new Error('down'));
    const res = await challenge(post('/api/auth/challenge', { address: ADDRESS }));
    expect(res.status).toBe(502);
  });
});

describe('POST /api/auth/session', () => {
  const body = { state: 's1', signedChallenge: '0xsigned', sessionSeconds: 1800 };

  it('trades the signed challenge for a token and keeps it in the session cookie only', async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: 'jwt-1' });
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(getDimoToken).toHaveBeenCalledWith({
      state: 's1',
      signedChallenge: '0xsigned',
      clientId: 'developer-platform',
      domain: `${config.frontendUrl}sign-in`,
    });
    expect(saveToken).toHaveBeenCalledWith('jwt-1', 1800);
  });

  it('accepts the email-code session length', async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: 'jwt-1' });
    const res = await session(
      post('/api/auth/session', { ...body, sessionSeconds: 900 }),
    );
    expect(res.status).toBe(200);
    expect(saveToken).toHaveBeenCalledWith('jwt-1', 900);
  });

  it.each([
    ['a longer session', { ...body, sessionSeconds: 86_400 }],
    ['no signature', { ...body, signedChallenge: '' }],
    ['no state', { ...body, state: undefined }],
  ])('refuses %s', async (_name, payload) => {
    const res = await session(post('/api/auth/session', payload));
    expect(res.status).toBe(400);
    expect(saveToken).not.toHaveBeenCalled();
  });

  it('refuses another site', async () => {
    const res = await session(post('/api/auth/session', body, 'https://evil.test'));
    expect(res.status).toBe(403);
    expect(getDimoToken).not.toHaveBeenCalled();
    expect(saveToken).not.toHaveBeenCalled();
  });

  it('sets no cookie when DIMO auth refuses the signature', async () => {
    (getDimoToken as jest.Mock).mockRejectedValue(new Error('bad signature'));
    const res = await session(post('/api/auth/session', body));
    expect(res.status).toBe(502);
    expect(saveToken).not.toHaveBeenCalled();
  });
});
