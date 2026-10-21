import { renderHook } from '@testing-library/react';

jest.mock('@/hooks/useGlobalAccount', () => ({ useGlobalAccount: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useTeam } from '@/hooks/useTeam';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';

const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const KERNEL_UPPER = '0x7A3C9E1F2B4D6A8C0E1F3A5B7C9D1E2F4A6B8C0D';
const ACME = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a';
const asUser = (address: string | null) =>
  (useGlobalAccount as jest.Mock).mockReturnValue({
    currentUser: address ? { smartContractAddress: address } : null,
  });
const inTeam = (role: 'OWNER' | 'MEMBER' | null, ownerAddress?: string) =>
  (useTeam as jest.Mock).mockReturnValue({
    isLoading: role === null,
    activeTeam: role ? { role, ownerAddress } : null,
  });

describe('useIsLicenseOwner', () => {
  it('is true for the owner in their own team, whatever the case', () => {
    asUser(KERNEL);
    inTeam('OWNER', KERNEL_UPPER);
    expect(
      renderHook(() => useIsLicenseOwner({ owner: KERNEL_UPPER })).result.current,
    ).toBe(true);
  });

  it("is false for a member looking at the team owner's license", () => {
    asUser(KERNEL);
    inTeam('MEMBER', ACME);
    expect(renderHook(() => useIsLicenseOwner({ owner: ACME })).result.current).toBe(
      false,
    );
  });

  it("is false for the user's own license while working in another team", () => {
    asUser(KERNEL);
    inTeam('MEMBER', ACME);
    expect(renderHook(() => useIsLicenseOwner({ owner: KERNEL })).result.current).toBe(
      false,
    );
  });

  it('trusts the wallet while teams are still loading', () => {
    asUser(KERNEL);
    inTeam(null);
    expect(renderHook(() => useIsLicenseOwner({ owner: KERNEL })).result.current).toBe(
      true,
    );
  });
});
