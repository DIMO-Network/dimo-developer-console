import { renderHook } from '@testing-library/react';
import { decodeFunctionData } from 'viem';

const mockProcess = jest.fn(async () => ({ success: true }));
jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
}));
import configuration from '@/config';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import { useSetLicenseSigners } from '@/hooks/useSetLicenseSigners';
import { UserOperationFailedError } from '@/utils/userOperation';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';

describe('useSetLicenseSigners', () => {
  it('sends every pair in one user operation', async () => {
    const set = renderHook(() => useSetLicenseSigners()).result.current;
    await set('disableSigner', [
      { tokenId: 42, signer: SIGNER },
      { tokenId: 43, signer: SIGNER },
    ]);
    expect(mockProcess).toHaveBeenCalledTimes(1);
    const calls = (
      mockProcess.mock.calls[0] as unknown as [{ to: string; data: `0x${string}` }[]]
    )[0];
    expect(calls.map((c) => c.to)).toEqual([
      configuration.DLC_ADDRESS,
      configuration.DLC_ADDRESS,
    ]);
    expect(
      calls.map((c) => decodeFunctionData({ abi: DimoLicenseABI, data: c.data })),
    ).toEqual([
      { functionName: 'disableSigner', args: [42n, SIGNER] },
      { functionName: 'disableSigner', args: [43n, SIGNER] },
    ]);
  });

  it('does nothing for no changes', async () => {
    await renderHook(() => useSetLicenseSigners()).result.current('enableSigner', []);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('rejects when the user operation lands but reverts (success: false, no throw)', async () => {
    mockProcess.mockResolvedValueOnce({ success: false });
    await expect(
      renderHook(() => useSetLicenseSigners()).result.current('enableSigner', [
        { tokenId: 42, signer: SIGNER },
      ]),
    ).rejects.toBeInstanceOf(UserOperationFailedError);
  });
});
