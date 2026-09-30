import React from 'react';
import { render, screen, within } from '@testing-library/react';

jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(),
}));
import { useQuery } from '@apollo/client';
import { SharingPanel } from '@/app/vehicles/[tokenId]/components/tabs/SharingPanel';
import type { VehicleDetail } from '@/services/subjects/graph';

// pairs 1,3,4 → Non-location data, Current location, All-time location
const PERMS = '0x' + ((3n << 2n) | (3n << 6n) | (3n << 8n)).toString(16);
const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'x', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: {
    nodes: [
      {
        grantee: '0xAAA',
        permissions: PERMS,
        createdAt: '2026-08-02T00:00:00Z',
        expiresAt: '2027-08-02T00:00:00Z',
        source: 'ipfs://bafy1',
      },
      {
        grantee: '0x1111111111111111111111111111111111111111',
        permissions: '0x0',
        createdAt: '2026-09-01T00:00:00Z',
        expiresAt: '2026-10-15T00:00:00Z',
        source: '',
      },
      {
        grantee: '0x2222222222222222222222222222222222222222',
        permissions: '0x3',
        createdAt: '2026-09-01T00:00:00Z',
        expiresAt: '2026-10-01T06:00:00Z',
        source: 'ipfs://bafy3',
      },
      {
        grantee: '0x3333333333333333333333333333333333333333',
        permissions: '0x3',
        createdAt: '2026-09-01T00:00:00Z',
        expiresAt: 'not-a-date',
        source: 'ipfs://bafy4',
      },
      {
        grantee: '0x5b1e000000000000000000000000000000000a09c',
        permissions: '0x3',
        createdAt: '2026-05-02T00:00:00Z',
        expiresAt: '2026-08-02T00:00:00Z',
        source: 'ipfs://bafy2',
      },
    ],
  },
  privileges: {
    nodes: [
      {
        id: 1,
        user: '0xdead',
        setAt: '2025-01-01T00:00:00Z',
        expiresAt: '2027-01-01T00:00:00Z',
      },
    ],
  },
} as unknown as VehicleDetail;

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  (useQuery as jest.Mock).mockImplementation(
    (_doc: unknown, opts: { variables: { clientId: string } }) => ({
      data: {
        developerLicense:
          opts.variables.clientId === '0xAAA'
            ? { alias: 'Fleet Pulse', clientId: '0xAAA' }
            : null,
      },
      loading: false,
    }),
  );
});

afterEach(() => jest.useRealTimers());

const row = (text: string) => screen.getByText(text).closest('div.grid') as HTMLElement;

describe('SharingPanel', () => {
  it('names apps, decodes permissions, links terms and marks the current license', () => {
    render(
      <SharingPanel
        vehicle={vehicle}
        clientId="0xaaa"
        licenseLabel="Fleet Pulse"
        accountState="shared"
      />,
    );
    expect(screen.getByText('Fleet Pulse')).toBeInTheDocument();
    expect(screen.getByText('This license')).toBeInTheDocument();
    expect(screen.getByText('Non-location data')).toBeInTheDocument();
    expect(screen.getByText('All-time location')).toBeInTheDocument();
    expect(screen.getByText('0x5b1e…a09c')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /View terms/ })[0]).toHaveAttribute(
      'href',
      'https://assets.dimo.org/ipfs/bafy1',
    );
    expect(screen.getByText('Expired Aug 2, 2026')).toBeInTheDocument();
  });
  it('warns when a grant expires within 30 days, pluralizing and rounding up', () => {
    render(
      <SharingPanel
        vehicle={vehicle}
        clientId="0xaaa"
        licenseLabel="Fleet Pulse"
        accountState="shared"
      />,
    );
    const warn = screen.getByText('Oct 15, 2026 · in 15 days');
    expect(warn).toHaveClass('text-warning');
    const one = screen.getByText('Oct 1, 2026 · in 1 day');
    expect(one).toHaveClass('text-warning');
  });
  it('handles empty permissions, missing terms and unparseable dates', () => {
    render(
      <SharingPanel
        vehicle={vehicle}
        clientId="0xaaa"
        licenseLabel="Fleet Pulse"
        accountState="shared"
      />,
    );
    const empty = row('0x1111…1111');
    expect(within(empty).getByText('None')).toBeInTheDocument();
    expect(within(empty).queryByRole('link', { name: /View terms/ })).toBeNull();
    const bad = row('0x3333…3333');
    expect(within(bad).getByText('—')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View terms for Fleet Pulse' }),
    ).toHaveAttribute('href', 'https://assets.dimo.org/ipfs/bafy1');
  });
  it('lists legacy privileges and the owner-account grant state', () => {
    render(
      <SharingPanel
        vehicle={vehicle}
        clientId="0xaaa"
        licenseLabel="Fleet Pulse"
        accountState="not-shared"
      />,
    );
    expect(screen.getByText('Legacy privileges')).toBeInTheDocument();
    expect(screen.getByText('Not shared')).toBeInTheDocument();
  });
});
