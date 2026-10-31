/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// middlewareUtils imports jose (ESM) at load time since #308; decodeJwtToken is
// mocked below, so jose is never called.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));

jest.mock('@/services/dimoDevAPI', () => ({
  cookieName: 'session-token',
  getCookie: jest.fn(async () => 'session.jwt'),
}));
jest.mock('@/utils/middlewareUtils', () => ({
  ...jest.requireActual('@/utils/middlewareUtils'),
  decodeJwtToken: jest.fn(async () => ({ ethereum_address: '0xkernel' })),
}));
jest.mock('@/services/user', () => ({
  getUserByToken: jest.fn(async () => {
    throw new Error('console-api is down');
  }),
}));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
import { proxy } from '@/proxy';

const TOKEN = 'Qm9vdHN0cmFwX3Rva2VuX2Zvcl90ZXN0aW5nXzEyMzQ1Ng';

describe('proxy and invite links', () => {
  it('keeps the invite even when the session check would fail and redirect', async () => {
    const res = (await proxy(
      new NextRequest(`http://console.test/sign-in?invite=${TOKEN}`),
      { waitUntil: jest.fn() } as never,
    )) as Response & { cookies: { get: (n: string) => { value: string } | undefined } };
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).searchParams.get('invite')).toBeNull();
    expect(res.cookies.get('invite_token')?.value).toBe(TOKEN);
  });
});
