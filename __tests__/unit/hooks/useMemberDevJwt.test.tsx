import React from 'react';
import { renderHook } from '@testing-library/react';

jest.mock('@/actions/dimoAuth', () => ({
  requestDexChallenge: jest.fn(),
  submitDexChallenge: jest.fn(),
}));
const signMessage = jest.fn(async () => '0xsigned');
jest.mock('@/services/turnkeyAccount', () => ({
  getSessionEoaAccount: jest.fn(async () => ({ signMessage })),
}));
jest.mock('@/utils/devJwt', () => ({ saveDevJwt: jest.fn() }));
import { requestDexChallenge, submitDexChallenge } from '@/actions/dimoAuth';
import { getSessionEoaAccount } from '@/services/turnkeyAccount';
import { saveDevJwt } from '@/utils/devJwt';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import {
  MEMBER_JWT_RETRY_MS,
  MemberDevJwtError,
  useMemberDevJwt,
} from '@/hooks/useMemberDevJwt';

const SESSION = {
  email: 'jane@harness.dev',
  subOrganizationId: 'sub-harness',
  walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' as const,
  smartContractAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d' as const,
};
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalAccountContext.Provider
    value={{
      currentUser: SESSION,
      validateCurrentSession: async () => SESSION,
      getCurrentDcxBalance: async () => 0,
      getCurrentDimoBalance: async () => 0,
      logout: async () => {},
    }}
  >
    {children}
  </GlobalAccountContext.Provider>
);
const ARGS = {
  clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  domain: 'https://harness.dev/callback',
};
const challenge = { ok: true, data: { challenge: 'sign me', state: 'st' } };
const run = () => renderHook(() => useMemberDevJwt(), { wrapper }).result.current(ARGS);
// The hook sets no React state, so the calls need no act().

describe('useMemberDevJwt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (requestDexChallenge as jest.Mock).mockReset().mockResolvedValue(challenge);
    (submitDexChallenge as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it("asks dex for the license's challenge and signs it with the EOA", async () => {
    (submitDexChallenge as jest.Mock).mockResolvedValue({
      ok: true,
      data: { access_token: 'dev.jwt' },
    });
    await expect(run()).resolves.toBe('dev.jwt');
    expect(requestDexChallenge).toHaveBeenCalledWith({
      address: ARGS.clientId,
      clientId: ARGS.clientId,
      domain: ARGS.domain,
    });
    expect(getSessionEoaAccount).toHaveBeenCalledWith(SESSION);
    expect(signMessage).toHaveBeenCalledWith({ message: 'sign me' });
    expect(saveDevJwt).toHaveBeenCalledWith(ARGS.clientId, 'dev.jwt');
  });

  it('retries only a 4xx from submit_challenge (signer not indexed yet)', async () => {
    (submitDexChallenge as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, data: { access_token: 'dev.jwt' } });
    const token = run();
    await jest.advanceTimersByTimeAsync(MEMBER_JWT_RETRY_MS);
    await expect(token).resolves.toBe('dev.jwt');
    expect(submitDexChallenge).toHaveBeenCalledTimes(2);
  });

  it('gives up after three 4xx answers with the propagation message', async () => {
    (submitDexChallenge as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    const settled = expect(run()).rejects.toEqual(
      new MemberDevJwtError('Access is still propagating — try again in a minute'),
    );
    await jest.advanceTimersByTimeAsync(MEMBER_JWT_RETRY_MS * 2);
    await settled;
    expect(submitDexChallenge).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 5xx, a failed challenge or a signing error', async () => {
    (submitDexChallenge as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(run()).rejects.toBeInstanceOf(MemberDevJwtError);
    expect(submitDexChallenge).toHaveBeenCalledTimes(1);

    (requestDexChallenge as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(run()).rejects.toBeInstanceOf(MemberDevJwtError);
    expect(submitDexChallenge).toHaveBeenCalledTimes(1);

    signMessage.mockRejectedValueOnce(new Error('Turnkey said no'));
    await expect(run()).rejects.toThrow('Turnkey said no');
    expect(submitDexChallenge).toHaveBeenCalledTimes(1);
  });
});
