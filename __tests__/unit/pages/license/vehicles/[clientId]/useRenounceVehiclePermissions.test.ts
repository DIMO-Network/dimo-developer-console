import { renderHook, act } from '@testing-library/react';

// Mock viem before hook import so encodeFunctionData doesn't validate addresses
jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  encodeFunctionData: jest.fn().mockReturnValue('0xencoded'),
}));

const mockProcessTransactions = jest.fn();
const MOCK_CLIENT_ID = '0xLICENSE';

jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcessTransactions }),
}));

jest.mock('@/hooks/useGlobalAccount', () => () => ({
  currentUser: { smartContractAddress: '0xUSER' },
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

describe('useRenounceVehiclePermissions', () => {
  beforeEach(() => {
    mockProcessTransactions.mockReset();
    (encodeFunctionData as jest.Mock).mockReset();
    (encodeFunctionData as jest.Mock).mockReturnValue('0xencoded');
  });

  it('calls execute on the license beacon (clientId), not SACD directly', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42, MOCK_CLIENT_ID);
    });

    expect(mockProcessTransactions).toHaveBeenCalledTimes(1);
    const [txs] = mockProcessTransactions.mock.calls[0];
    expect(txs[0].to).toBe(MOCK_CLIENT_ID);
    expect(txs[0].value).toBe(BigInt(0));
    expect(txs[0].data).toBe('0xencoded');
  });

  it('encodes execute with SACD address and renouncePermissions calldata', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42, MOCK_CLIENT_ID);
    });

    // First call: encode renouncePermissions calldata
    expect(encodeFunctionData).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        functionName: 'renouncePermissions',
        args: ['0xBEEF000000000000000000000000000000000001', BigInt(42)],
      }),
    );

    // Second call: encode execute(sacdAddress, 0, renounceCalldata)
    expect(encodeFunctionData).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        functionName: 'execute',
        args: ['0x5ACD000000000000000000000000000000000001', BigInt(0), '0xencoded'],
      }),
    );
  });

  it('throws when processTransactions returns success: false with a reason', async () => {
    mockProcessTransactions.mockResolvedValue({ success: false, reason: 'reverted' });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await expect(
      act(async () => {
        await result.current.renounce(42, MOCK_CLIENT_ID);
      }),
    ).rejects.toThrow('reverted');
  });

  it('throws with fallback message when success: false and no reason', async () => {
    mockProcessTransactions.mockResolvedValue({ success: false, reason: undefined });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await expect(
      act(async () => {
        await result.current.renounce(42, MOCK_CLIENT_ID);
      }),
    ).rejects.toThrow('Transaction failed');
  });

  it('isLoading is false initially', () => {
    const { result } = renderHook(() => useRenounceVehiclePermissions());
    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading returns to false after success', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42, MOCK_CLIENT_ID);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading returns to false after failure', async () => {
    mockProcessTransactions.mockRejectedValue(new Error('reverted'));
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      try {
        await result.current.renounce(42, MOCK_CLIENT_ID);
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});
