import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const render = (ui: React.ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/vehicles/190231',
  useSearchParams: () => new URLSearchParams('license=0xaaa'),
}));
jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useQuery: jest.fn(),
}));
jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/hooks/useGetDevJwts', () => ({ useGetDevJwts: jest.fn() }));
jest.mock('@/hooks/useGlobalAccount', () => ({ useGlobalAccount: jest.fn() }));
jest.mock('@/hooks/subjects/useSubjectFreshness', () => ({
  useSubjectFreshness: jest.fn(),
}));
jest.mock('@/hooks/subjects/useSubjectQuery', () => ({
  ...jest.requireActual('@/hooks/subjects/useSubjectQuery'),
  useSubjectQuery: jest.fn(() => ({ data: undefined, isLoading: false, error: null })),
}));
jest.mock('@/hooks/useLicenseDataAccess', () => ({ useLicenseDataAccess: jest.fn() }));
const reportRemoved = jest.fn();
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ reportRemoved, activeTeam: { ownerEmail: 'ops@acme.dev' } }),
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label = 'Connect with your wallet' }: { label?: string }) => (
    <button>{label}</button>
  ),
}));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
import { useQuery } from '@apollo/client/react';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import { DataApiError } from '@/services/subjects/client';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehiclePage } from '@/app/vehicles/[tokenId]/components/VehiclePage';

const WALLET = '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const license = new LocalDeveloperLicense({
  alias: 'Harness Fleet',
  clientId: '0xaaa',
  redirectURIs: { nodes: [{ uri: 'https://x' }] },
  signers: { nodes: [{ address: WALLET }] },
} as never);
const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: WALLET,
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'toyota_rav4_2024', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: {
    nodes: [
      {
        grantee: '0xaaa',
        permissions: '0x3fc',
        createdAt: '2026-08-02T00:00:00Z',
        expiresAt: '2027-08-02T00:00:00Z',
        source: 'ipfs://x',
      },
    ],
  },
  privileges: { nodes: [] },
};
const refusal = (memberOfTeam: boolean) =>
  new DataApiError(403, 'NO_ACCESS', 'x', [], memberOfTeam);

beforeEach(() => {
  (useQuery as unknown as jest.Mock).mockReturnValue({
    data: { vehicle },
    loading: false,
  });
  (useGlobalAccount as jest.Mock).mockReturnValue({
    currentUser: { smartContractAddress: '0xkernel', walletAddress: WALLET },
  });
  (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
    developerLicenses: [license],
    loading: false,
  });
  (useGetDevJwts as jest.Mock).mockReturnValue({
    isAuthenticatedAsDev: true,
    refetch: jest.fn(),
  });
  (useLicenseDataAccess as jest.Mock).mockReturnValue({ kind: 'member' });
});

describe('VehiclePage for a member', () => {
  it('reports a removal when the proxy says the user is no longer in the team', async () => {
    (useSubjectFreshness as jest.Mock).mockReturnValue({
      byDid: {},
      isLoading: false,
      error: refusal(false),
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText('You no longer have access to this license.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(reportRemoved).toHaveBeenCalled());
  });

  it('offers to reconnect when the proxy refuses but Identity still lists the wallet', () => {
    (useSubjectFreshness as jest.Mock).mockReturnValue({
      byDid: {},
      isLoading: false,
      error: refusal(true),
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByRole('button', { name: 'Reconnect with your wallet' }),
    ).toBeInTheDocument();
    expect(reportRemoved).not.toHaveBeenCalled();
  });

  it('shows the C8 unavailable copy while the flag is off', () => {
    (useLicenseDataAccess as jest.Mock).mockReturnValue({ kind: 'member-unavailable' });
    (useSubjectFreshness as jest.Mock).mockReturnValue({
      byDid: {},
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText("Data access for team members isn't available yet."),
    ).toBeInTheDocument();
  });

  it('shows an error state for an unknown proxy answer', () => {
    (useSubjectFreshness as jest.Mock).mockReturnValue({
      byDid: {},
      isLoading: false,
      error: new DataApiError(400, 'INVALID_CLIENT_ID' as never, 'x'),
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText("We couldn't check your access to Harness Fleet."),
    ).toBeInTheDocument();
  });
});
