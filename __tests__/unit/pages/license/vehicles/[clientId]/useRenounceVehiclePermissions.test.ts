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

  it('calls processTransactions targeting the SACD contract', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42, '0xCLIENT');
    });

    expect(mockProcessTransactions).toHaveBeenCalledTimes(1);
    const [txs] = mockProcessTransactions.mock.calls[0];
    expect(txs[0].to).toBe('0x5ACD000000000000000000000000000000000001');
    expect(txs[0].value).toBe(BigInt(0));
    expect(txs[0].data).toBe('0xencoded');
  });

  it('encodes renouncePermissions with asset and tokenId', async () => {
    mockProcessTransactions.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      await result.current.renounce(42, '0xCLIENT');
    });

    expect(encodeFunctionData).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'renouncePermissions',
        args: ['0xBEEF000000000000000000000000000000000001', BigInt(42)],
      }),
    );
  });

  it('throws when processTransactions returns success: false with a reason', async () => {
    mockProcessTransactions.mockResolvedValue({ success: false, reason: 'reverted' });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await expect(
      act(async () => {
        await result.current.renounce(42, '0xCLIENT');
      }),
    ).rejects.toThrow('reverted');
  });

  it('throws with fallback message when success: false and no reason', async () => {
    mockProcessTransactions.mockResolvedValue({ success: false, reason: undefined });
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await expect(
      act(async () => {
        await result.current.renounce(42, '0xCLIENT');
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
      await result.current.renounce(42, '0xCLIENT');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading returns to false after failure', async () => {
    mockProcessTransactions.mockRejectedValue(new Error('reverted'));
    const { result } = renderHook(() => useRenounceVehiclePermissions());

    await act(async () => {
      try {
        await result.current.renounce(42, '0xCLIENT');
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});
