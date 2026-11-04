jest.mock('@/services/turnkey', () => ({
  getTurnkeyClient: jest.fn(() => ({})),
  getTurnkeyWalletAddress: jest.fn(
    async () => '0x00000000000000000000000000000000000000aa',
  ),
}));
const signMessage = jest.fn(async () => '0xsigned');
jest.mock('@/services/zerodev', () => ({
  getKernelAccount: jest.fn(async () => ({
    address: '0x00000000000000000000000000000000000000bb',
    signMessage,
  })),
}));
// The sign-in page's server actions: a renewal must not use them (the proxy
// answers them with a 401 on any other page once the cookie is gone).
jest.mock('@/actions/dimoAuth', () => ({
  getDimoChallenge: jest.fn(),
  getDimoToken: jest.fn(),
}));
jest.mock('@/actions/user', () => ({ saveToken: jest.fn() }));
jest.mock('@/app/sign-up/actions', () => ({
  createNewUser: jest.fn(),
  completeUserData: jest.fn(),
}));
jest.mock('@/config/turnkey', () => ({ passkeyClient: {} }));
jest.mock('@/services/globalAccount', () => ({
  initOtpLogin: jest.fn(),
  otpLogin: jest.fn(),
}));

import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { saveToken } from '@/actions/user';
import { completeUserData, createNewUser } from '@/app/sign-up/actions';
import { renewConsoleSession } from '@/services/consoleSignIn';
import { SESSION_KEY } from '@/utils/globalAccountSession';

const ACCOUNT = { email: 'sam@harness.dev', subOrganizationId: 'sub-sam' };
const CREDENTIAL = {
  credentialBundle: 'bundle-new',
  privateKey: 'key-new',
  sessionSeconds: 1800,
  expiry: 1_900_000_000,
};
const storeSessionFor = (subOrganizationId: string) =>
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      email: 'sam@harness.dev',
      role: 'owner',
      subOrganizationId,
      token: 'bundle-old',
      eKey: 'key-old',
      expiry: 1,
    }),
  );
const stored = () => JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');

const fetchMock = jest.fn();
const answer = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 502,
  json: async () => body,
});

describe('renewConsoleSession', () => {
  beforeEach(() => {
    localStorage.clear();
    storeSessionFor(ACCOUNT.subOrganizationId);
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation(async (path: string) =>
      path === '/api/auth/challenge'
        ? answer({ challenge: 'sign me', state: 'state-1' })
        : answer({ ok: true }),
    );
  });

  it("signs DIMO's challenge through /api/auth and stores the new session for the same account", async () => {
    await expect(
      renewConsoleSession({ account: ACCOUNT, credential: CREDENTIAL }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: '0x00000000000000000000000000000000000000bb' }),
      signal: expect.any(AbortSignal),
    });
    expect(signMessage).toHaveBeenCalledWith({ message: 'sign me' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'state-1',
        signedChallenge: '0xsigned',
        sessionSeconds: 1800,
      }),
      signal: expect.any(AbortSignal),
    });
    expect(stored()).toEqual({
      email: ACCOUNT.email,
      role: 'owner',
      subOrganizationId: ACCOUNT.subOrganizationId,
      token: 'bundle-new',
      expiry: 1_900_000_000,
      eKey: 'key-new',
    });
  });

  it("uses none of the sign-in page's server actions and leaves the account as it is", async () => {
    await renewConsoleSession({ account: ACCOUNT, credential: CREDENTIAL });
    expect(getDimoChallenge).not.toHaveBeenCalled();
    expect(getDimoToken).not.toHaveBeenCalled();
    expect(saveToken).not.toHaveBeenCalled();
    expect(createNewUser).not.toHaveBeenCalled();
    expect(completeUserData).not.toHaveBeenCalled();
  });

  it('writes nothing, and asks for no cookie, once another account signed in meanwhile', async () => {
    signMessage.mockImplementationOnce(async () => {
      storeSessionFor('sub-someone-else');
      return '0xsigned';
    });
    await expect(
      renewConsoleSession({ account: ACCOUNT, credential: CREDENTIAL }),
    ).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(stored().subOrganizationId).toBe('sub-someone-else');
  });

  it('takes the cookie back when another tab signed out while it was set', async () => {
    fetchMock.mockImplementation(async (path: string, init: { method: string }) => {
      if (path === '/api/auth/challenge')
        return answer({ challenge: 'sign me', state: 's' });
      if (init.method === 'POST') localStorage.removeItem(SESSION_KEY);
      return answer({ ok: true });
    });
    await expect(
      renewConsoleSession({ account: ACCOUNT, credential: CREDENTIAL }),
    ).resolves.toBe(false);
    expect(stored()).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/session', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: '0x00000000000000000000000000000000000000bb' }),
      signal: expect.any(AbortSignal),
    });
  });

  it('asks for no cookie once the dialog closed', async () => {
    const closing = new AbortController();
    signMessage.mockImplementationOnce(async () => {
      closing.abort();
      return '0xsigned';
    });
    await expect(
      renewConsoleSession({
        account: ACCOUNT,
        credential: CREDENTIAL,
        signal: closing.signal,
      }),
    ).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(stored().token).toBe('bundle-old');
  });

  it('fails, writing nothing, when a route fails', async () => {
    fetchMock.mockImplementation(async (path: string) =>
      path === '/api/auth/challenge'
        ? answer({ challenge: 'sign me', state: 's' })
        : answer({ message: 'Could not sign in' }, false),
    );
    await expect(
      renewConsoleSession({ account: ACCOUNT, credential: CREDENTIAL }),
    ).rejects.toThrow('POST /api/auth/session failed with 502');
    expect(stored().token).toBe('bundle-old');
  });
});
