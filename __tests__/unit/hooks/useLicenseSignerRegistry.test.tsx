import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listLicenseSigners: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ activeTeam: { id: 'team-harness' }, isLoading: false }),
}));
import { listLicenseSigners } from '@/actions/teams';
import { useLicenseSignerRegistry } from '@/hooks/useLicenseSignerRegistry';
import { TeamApiError } from '@/utils/teamApiError';

const record = (signerAddress: string, disabledAt: string | null = null) => ({
  signerAddress,
  kind: 'API_KEY',
  note: null,
  holders: [{ userId: null, name: 'Ops on-call', email: null }],
  createdAt: '2026-09-01T00:00:00Z',
  createdBy: 'user-harness',
  disabledAt,
  disabledBy: null,
});
const makeWrapper = () => {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useLicenseSignerRegistry', () => {
  it('maps enabled rows by lowercase address', async () => {
    (listLicenseSigners as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        signers: [
          record('0x5b2E4F6A8C0D2e4f6A8C0D2e4f6a8c0D2e4F6a8c'),
          record('0x3a5C7e9b2d4F6a8c1c3E5A7B9d0F2a4c6E8B0D1f', '2026-09-20T00:00:00Z'),
        ],
      },
    });
    const { result } = renderHook(() => useLicenseSignerRegistry(42), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.byAddress.size).toBe(1));
    expect(
      result.current.byAddress.has('0x5b2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c'),
    ).toBe(true);
    expect(listLicenseSigners).toHaveBeenCalledWith(42);
  });

  it('fails with a TeamApiError', async () => {
    (listLicenseSigners as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: 'IDENTITY_UNAVAILABLE',
      message: 'x',
    });
    const { result } = renderHook(() => useLicenseSignerRegistry(42), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(TeamApiError);
  });
});
