import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const render = (ui: React.ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const replace = jest.fn();
let params = new URLSearchParams('license=0xaaa');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
  usePathname: () => '/vehicles/190231',
  useSearchParams: () => params,
}));
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(),
}));
jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/hooks/useGetDevJwts', () => ({ useGetDevJwts: jest.fn() }));
jest.mock('@/hooks/subjects/useSubjectFreshness', () => ({
  useSubjectFreshness: jest.fn(),
}));
jest.mock('@/hooks/subjects/useSubjectQuery', () => ({
  ...jest.requireActual('@/hooks/subjects/useSubjectQuery'),
  useSubjectQuery: jest.fn(),
}));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));

import { useQuery } from '@apollo/client';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehiclePage } from '@/app/vehicles/[tokenId]/components/VehiclePage';

const lic = (clientId: string, alias: string) =>
  new LocalDeveloperLicense({
    alias,
    clientId,
    redirectURIs: { nodes: [{ uri: 'https://x' }] },
  });
const vehicle = (grantees: string[]) => ({
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'toyota_rav4_2024', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: {
    nodes: grantees.map((g) => ({
      grantee: g,
      permissions: '0x3fc',
      createdAt: '2026-08-02T00:00:00Z',
      expiresAt: '2027-08-02T00:00:00Z',
      source: 'ipfs://x',
    })),
  },
  privileges: { nodes: [] },
});

beforeEach(() => {
  params = new URLSearchParams('license=0xaaa');
  (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
    developerLicenses: [lic('0xaaa', 'Fleet Pulse'), lic('0xbbb', 'Other')],
    loading: false,
  });
  (useGetDevJwts as jest.Mock).mockReturnValue({
    isAuthenticatedAsDev: true,
    refetch: jest.fn(),
  });
  (useSubjectFreshness as jest.Mock).mockReturnValue({
    byDid: {},
    isLoading: false,
    error: null,
  });
  (useSubjectQuery as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  });
});

describe('VehiclePage', () => {
  it('renders the header with the eligible license selected', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xAAA']) },
      loading: false,
    });
    render(<VehiclePage tokenId={190231} />);
    expect(screen.getByRole('heading', { name: 'Toyota RAV4 2024' })).toBeInTheDocument();
    expect(screen.getByText('#190231')).toBeInTheDocument();
    expect(screen.getAllByText('Fleet Pulse').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(useSubjectFreshness).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('shows the not-shared notice and asks for no data when no license has a grant', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xccc']) },
      loading: false,
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText("This vehicle isn't shared with any of your licenses"),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Summary' })).toBeDisabled();
    expect(useSubjectFreshness).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getAllByText('No access').length).toBeGreaterThan(0);
  });

  it('asks for a developer JWT when the license has none stored', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xaaa']) },
      loading: false,
    });
    (useGetDevJwts as jest.Mock).mockReturnValue({
      isAuthenticatedAsDev: false,
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText('Generate a developer JWT to read this vehicle'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
  });

  it('falls back to the first eligible license when the URL names an ineligible one', () => {
    params = new URLSearchParams('license=0xbbb');
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xaaa']) },
      loading: false,
    });
    render(<VehiclePage tokenId={190231} />);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('license=0xaaa'), {
      scroll: false,
    });
  });

  it('says so when the vehicle does not exist', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: { vehicle: null }, loading: false });
    render(<VehiclePage tokenId={1} />);
    expect(screen.getByText('No vehicle has token ID 1.')).toBeInTheDocument();
  });
});
