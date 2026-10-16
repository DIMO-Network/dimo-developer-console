import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
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
import {
  signerRegisteredKey,
  useSignerRegistration,
} from '@/hooks/useSignerRegistration';
import { SIGNER_IN_USE_MESSAGE } from '@/config/teamCopy';

const SESSION = {
  email: 'sam@harness.dev',
  subOrganizationId: 'sub-sam',
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
const refused = (code: string) => ({ ok: false, status: 409, code, message: 'x' });

describe('useSignerRegistration', () => {
  beforeEach(() => sessionStorage.clear());

  it('signs the C6 message with the EOA and registers it once per session', async () => {
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
    expect(
      sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress)),
    ).not.toBeNull();
    rerender();
    expect(registerSigner).toHaveBeenCalledTimes(1);
  });

  it('explains SIGNER_LOCKED with the C8 copy and does not retry this session', async () => {
    (registerSigner as jest.Mock).mockResolvedValue(refused('SIGNER_LOCKED'));
    renderHook(() => useSignerRegistration('ops@acme.dev'), { wrapper });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Your access is tied to another wallet. Ask ops@acme.dev to revoke it first.',
      ),
    );
    expect(
      sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress)),
    ).not.toBeNull();
  });

  it('explains SIGNER_IN_USE', async () => {
    (registerSigner as jest.Mock).mockResolvedValue(refused('SIGNER_IN_USE'));
    renderHook(() => useSignerRegistration(null), { wrapper });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SIGNER_IN_USE_MESSAGE));
  });

  it('retries on a later session after any other refusal', async () => {
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
    expect(sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress))).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
