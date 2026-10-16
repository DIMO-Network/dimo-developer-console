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
jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
import { getUserByToken } from '@/services/user';
import { middleware } from '@/middleware';

describe('middleware and the data proxy', () => {
  it("lets /api/data/* through on a valid session without calling console-api's /api/me", async () => {
    const res = await middleware(
      new NextRequest('http://console.test/api/data/telemetry', { method: 'POST' }),
      {} as never,
    );
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(getUserByToken).not.toHaveBeenCalled();
  });
});
