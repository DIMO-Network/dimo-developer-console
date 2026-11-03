/**
 * @jest-environment node
 */
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockGetDeveloperJwt = jest.fn();
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const client = { post: (...args: unknown[]) => mockPost(...args) };
  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, create: () => client },
  };
});
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
jest.mock('@/services/dimoDevAPI', () => ({
  cookieName: 'token',
  dimoDevAPIClient: jest.fn(async () => ({ get: mockGet })),
}));
jest.mock('@/services/user', () => ({
  existUserByEmailOrAddress: jest.fn(),
  getUserByToken: jest.fn(),
}));
jest.mock('@/services/globalAccount', () => ({}));
jest.mock('@dimo-network/data-sdk', () => ({
  DIMO: jest.fn().mockImplementation(() => ({
    auth: { getDeveloperJwt: (...args: unknown[]) => mockGetDeveloperJwt(...args) },
  })),
}));
import * as Sentry from '@sentry/nextjs';
import { AxiosError, type AxiosResponse } from 'axios';
import { submitDexChallenge } from '@/actions/dimoAuth';
import { getSimulatedVehicles } from '@/actions/simulatedVehicles';
import { getUser } from '@/actions/user';
import { getDeveloperJwt } from '@/services/dimoDev';
import { getUserByToken } from '@/services/user';

const INPUT = {
  state: 'st',
  signedChallenge: '0xs',
  clientId: '0xaaa',
  domain: 'https://x',
};
const TOKEN = { client_id: '0xabc', domain: 'https://x', private_key: 'private-key-1' };

const refused = (status: number, data?: string) =>
  new AxiosError(
    'failed',
    'ERR_BAD_RESPONSE',
    { headers: {}, data } as never,
    { body: data },
    { status, data: {}, config: { headers: {}, data } } as unknown as AxiosResponse,
  );

const cases: [string, () => Promise<unknown>, jest.Mock, (s: number) => unknown][] = [
  ['getUser', () => getUser(), getUserByToken as jest.Mock, () => null],
  [
    'getSimulatedVehicles',
    () => getSimulatedVehicles({ clientId: '0xabc' }),
    mockGet,
    () => [],
  ],
  ['getDeveloperJwt', () => getDeveloperJwt(TOKEN), mockGetDeveloperJwt, () => null],
  [
    'submitDexChallenge',
    () => submitDexChallenge(INPUT),
    mockPost,
    (status) => ({ ok: false, status }),
  ],
];

describe('swallowed failures', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(cases)(
    'reports a 500 from %s once and returns what it always did',
    async (_n, call, upstream, result) => {
      upstream.mockRejectedValue(refused(500));
      await expect(call()).resolves.toEqual(result(500));
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    },
  );

  it.each(cases)(
    'stays quiet about a 4xx from %s',
    async (_n, call, upstream, result) => {
      upstream.mockRejectedValue(refused(404));
      await expect(call()).resolves.toEqual(result(404));
      expect(Sentry.captureException).not.toHaveBeenCalled();
    },
  );

  it.each(cases)(
    'reports a network failure from %s',
    async (_n, call, upstream, result) => {
      upstream.mockRejectedValue(new Error('socket hang up'));
      await expect(call()).resolves.toEqual(result(0));
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    },
  );

  it("reports getDeveloperJwt's failure without its request body", async () => {
    mockGetDeveloperJwt.mockRejectedValue(refused(500, 'private-key-1'));
    await getDeveloperJwt(TOKEN);
    const captured = (Sentry.captureException as jest.Mock).mock.calls[0][0];
    expect(captured.config.data).toBeUndefined();
    expect(JSON.stringify(captured.response.config)).not.toContain('private-key-1');
  });

  it('stays quiet when a visitor without a session asks for the user', async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(refused(401));
    await expect(getUser()).resolves.toBeNull();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
