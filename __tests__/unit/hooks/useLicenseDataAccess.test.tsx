import { renderHook } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/hooks/useGlobalAccount', () => ({ useGlobalAccount: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import { LocalDeveloperLicense } from '@/types/webhook';

const EOA = '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const EOA_UPPER = '0x9F1E2D3C4B5A69788796A5B4C3D2E1F0A9B8C7D6';
const license = (signers: string[]) =>
  new LocalDeveloperLicense({
    alias: 'Harness Fleet',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
    signers: { nodes: signers.map((address) => ({ address })) },
  } as never);
const member = () =>
  (useTeam as jest.Mock).mockReturnValue({
    isMember: true,
    activeTeam: { ownerEmail: 'ops@acme.dev' },
  });

describe('useLicenseDataAccess', () => {
  beforeEach(() =>
    (useGlobalAccount as jest.Mock).mockReturnValue({
      currentUser: { walletAddress: EOA },
    }),
  );

  it('treats everyone outside a member team as the owner', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: false });
    expect(
      renderHook(() => useLicenseDataAccess(license([]), true)).result.current,
    ).toEqual({
      kind: 'owner',
    });
  });

  it('gives a member access when their wallet is a signer, any case', () => {
    member();
    expect(
      renderHook(() => useLicenseDataAccess(license([EOA_UPPER]), true)).result.current,
    ).toEqual({
      kind: 'member',
    });
  });

  it('tells a member without a key whom to ask', () => {
    member();
    expect(
      renderHook(() => useLicenseDataAccess(license([]), true)).result.current,
    ).toEqual({
      kind: 'member-no-access',
      ownerEmail: 'ops@acme.dev',
    });
  });

  it('is unavailable to members while the flag is off (C5)', () => {
    member();
    expect(
      renderHook(() => useLicenseDataAccess(license([EOA]), false)).result.current,
    ).toEqual({
      kind: 'member-unavailable',
    });
  });
});
