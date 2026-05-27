import { renderHook, act } from '@testing-library/react';

// Mock viem before hook import so encodeFunctionData doesn't validate addresses
jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  encodeFunctionData: jest.fn().mockReturnValue('0xencoded'),
}));

const mockProcessTransactions = jest.fn();

jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcessTransactions }),
}));

const mockUseGlobalAccount = jest.fn();
jest.mock('@/hooks/useGlobalAccount', () => ({
  __esModule: true,
  default: () => mockUseGlobalAccount(),
}));

jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    DIMO_SACD_ADDRESS: '0x5ACD000000000000000000000000000000000001',
    VEHICLE_NFT_ADDRESS: '0xBEEF000000000000000000000000000000000001',
  },
}));

import { useRenounceVehiclePermissions } from '@/hooks/useRenounceVehiclePermissions';
import { encodeFunctionData } from 'viem';

const SMART_CONTRACT_ADDRESS = '0xDEAD000000000000000000000000000000000001';

describe('useRenounceVehiclePermissions', () => {
  beforeEach(() => {
    mockProcessTransactions.mockReset();
    (encodeFunctionData as jest.Mock).mockReset();
    (encodeFunctionData as jest.Mock).mockReturnValue('0xencoded');
    mockUseGlobalAccount.mockReturnValue({
      currentUser: { smartContractAddress: SMART_CONTRACT_ADDRESS },
    });
  });

  it('calls processTransactions targeting the SACD contract', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42);
    });

    expect(mockProcessTransactions).toHaveBeenCalledTimes(1);
    const [txs] = mockProcessTransactions.mock.calls[0];
    expect(txs[0].to).toBe('0x5ACD000000000000000000000000000000000001');
    expect(txs[0].value).toBe(BigInt(0));
    expect(txs[0].data).toBe('0xencoded');
  });

  it('encodes setPermissions with permissions=0 and expiration=0', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42);
    });

    expect(encodeFunctionData).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'setPermissions',
        args: expect.arrayContaining([
          '0xBEEF000000000000000000000000000000000001', // asset
          BigInt(42), // tokenId
          SMART_CONTRACT_ADDRESS, // grantee
          BigInt(0), // permissions
          BigInt(0), // expiration
          '', // source
        ]),
      }),
    );
  });

  it('throws when currentUser is null', async () => {
    mockUseGlobalAccount.mockReturnValue({ currentUser: null });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await expect(
      act(async () => {
        await result.current.renounce(1);
      }),
    ).rejects.toThrow('User session is invalid');
  });

  it('isLoading is false initially', () => {
    const { result } = renderHook(() => useRenounceVehiclePermissions());
    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading returns to false after success', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(7);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading returns to false after failure', async () => {
    mockProcessTransactions.mockRejectedValue(new Error('reverted'));
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      try {
        await result.current.renounce(7);
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});
