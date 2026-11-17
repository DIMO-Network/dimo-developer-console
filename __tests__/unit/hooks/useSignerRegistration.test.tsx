import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getAddress } from 'viem';

jest.mock('@/actions/teams', () => ({ registerSigner: jest.fn() }));
const signMessage = jest.fn(async () => '0xsigned');
jest.mock('@/services/turnkeyAccount', () => ({
  getSessionEoaAccount: jest.fn(async () => ({ signMessage })),
}));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));
import * as Sentry from '@sentry/nextjs';
import { registerSigner } from '@/actions/teams';
import { toast } from 'sonner';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { useSignerRegistration } from '@/hooks/useSignerRegistration';
import { SESSION_KEY, SIGNER_PROOF_KEY } from '@/utils/globalAccountSession';
import common from '../../../messages/en/common.json';

const SESSION = {
  email: 'sam@harness.dev',
  subOrganizationId: 'sub-sam',
  walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' as const,
  smartContractAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d' as const,
};
// The shared sign-in every tab reads (src/utils/globalAccountSession.ts).
const EXPIRY = Math.floor(Date.now() / 1000) + 1800;
const signIn = (expiry = EXPIRY) =>
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      email: SESSION.email,
      role: 'owner',
      subOrganizationId: SESSION.subOrganizationId,
      token: 'bundle',
      eKey: 'embedded-key',
      expiry,
    }),
  );
const mark = () => JSON.parse(localStorage.getItem(SIGNER_PROOF_KEY) ?? 'null');
const setMark = (value: object) =>
  localStorage.setItem(SIGNER_PROOF_KEY, JSON.stringify(value));

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
const refused = (code: string) => ({ ok: false, status: 409, code, message: 'x' });
// Lets the hook's async work run, for the checks that it did nothing.
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

describe('useSignerRegistration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    signIn();
  });

  it('signs the C6 message with the EOA and registers it once per sign-in', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    const { rerender } = renderHook(() => useSignerRegistration(null), { wrapper });
    await waitFor(() => expect(registerSigner).toHaveBeenCalledTimes(1));
    const [input] = (registerSigner as jest.Mock).mock.calls[0];
    expect(input.address).toBe(getAddress(SESSION.walletAddress));
    expect(input.signature).toBe('0xsigned');
    expect(input.message).toMatch(
      new RegExp(
        `^DIMO Developer Console\\nLink signer ${getAddress(SESSION.walletAddress)} to account ${getAddress(SESSION.smartContractAddress)}\\nIssued at \\d{4}-\\d{2}-\\d{2}T`,
      ),
    );
    expect(signMessage).toHaveBeenCalledWith({ message: input.message });
    await waitFor(() =>
      expect(mark()).toEqual({
        wallet: SESSION.walletAddress.toLowerCase(),
        expiry: EXPIRY,
        state: 'done',
      }),
    );
    rerender();
    expect(registerSigner).toHaveBeenCalledTimes(1);
  });

  it('skips the proof in another tab of the same sign-in', async () => {
    setMark({
      wallet: SESSION.walletAddress.toLowerCase(),
      expiry: EXPIRY,
      state: 'done',
    });
    renderHook(() => useSignerRegistration(null), { wrapper });
    await settle();
    expect(signMessage).not.toHaveBeenCalled();
    expect(registerSigner).not.toHaveBeenCalled();
  });

  it('proves again after a new sign-in', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    setMark({
      wallet: SESSION.walletAddress.toLowerCase(),
      expiry: EXPIRY - 3600,
      state: 'done',
    });
    renderHook(() => useSignerRegistration(null), { wrapper });
    await waitFor(() => expect(registerSigner).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mark().expiry).toBe(EXPIRY));
  });

  it("doesn't count another wallet's mark", async () => {
    (registerSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    setMark({
      wallet: '0x0000000000000000000000000000000000000001',
      expiry: EXPIRY,
      state: 'done',
    });
    renderHook(() => useSignerRegistration(null), { wrapper });
    await waitFor(() => expect(registerSigner).toHaveBeenCalledTimes(1));
  });

  it('explains SIGNER_LOCKED with the C8 copy and does not retry this sign-in', async () => {
    (registerSigner as jest.Mock).mockResolvedValue(refused('SIGNER_LOCKED'));
    renderHook(() => useSignerRegistration('ops@acme.dev'), { wrapper });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Your access is tied to another wallet. Ask ops@acme.dev to revoke it first.',
      ),
    );
    expect(mark()).toEqual({
      wallet: SESSION.walletAddress.toLowerCase(),
      expiry: EXPIRY,
      state: 'blocked',
    });
  });

  it('explains SIGNER_IN_USE', async () => {
    (registerSigner as jest.Mock).mockResolvedValue(refused('SIGNER_IN_USE'));
    renderHook(() => useSignerRegistration(null), { wrapper });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(common.teamCopy.signerInUse),
    );
  });

  it('retries on a later sign-in after any other refusal', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      code: 'SIGNER_PROOF_INVALID',
      message: 'x',
    });
    renderHook(() => useSignerRegistration(null), { wrapper });
    // The refusal is handled (reported) before the negative checks run.
    await waitFor(() =>
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Signer proof refused: SIGNER_PROOF_INVALID',
      ),
    );
    expect(mark()).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
