import { renderHook } from '@testing-library/react';

const mockProcess = jest.fn();
// The @/hooks barrel pulls Turnkey; these two hooks only need these.
jest.mock('@/hooks', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
  useGlobalAccount: () => ({
    validateCurrentSession: async () => ({ walletAddress: '0x1' }),
  }),
}));
jest.mock('@/hooks/useSACD', () => ({ useSACD: jest.fn() }));
jest.mock('@/services/pricing', () => ({ getCurrentDimoPrice: jest.fn() }));
import { useDisableSigner, useEnableSigner } from '@/hooks/useTransactions';
import { UserOperationFailedError } from '@/utils/userOperation';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const enable = () => renderHook(() => useEnableSigner(42)).result.current(SIGNER);
const disable = () => renderHook(() => useDisableSigner(42)).result.current(SIGNER);

describe('useEnableSigner and useDisableSigner', () => {
  it('resolve when the user operation succeeds', async () => {
    mockProcess.mockResolvedValue({ success: true });
    await expect(enable()).resolves.toBeUndefined();
    await expect(disable()).resolves.toBeUndefined();
  });

  it('reject when it lands but reverts (success: false, no throw)', async () => {
    mockProcess.mockResolvedValue({ success: false });
    await expect(enable()).rejects.toBeInstanceOf(UserOperationFailedError);
    await expect(disable()).rejects.toBeInstanceOf(UserOperationFailedError);
  });
});
