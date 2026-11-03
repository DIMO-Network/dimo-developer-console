import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/hooks', () => ({
  useGlobalAccount: () => ({
    currentUser: { walletAddress: '0xowner', smartContractAddress: '0xwallet' },
  }),
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: () => ({ isOwner: true }) }));
jest.mock('@/actions/connections', () => ({ deleteConnection: jest.fn() }));
jest.mock('@/services/connectionLookup', () => ({ findMintedConnection: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import ConnectionsList from '@/app/connections/components/View/View';
import { KEYS_UNREADABLE_CHIP } from '@/app/connections/copy';

const row = (id: string, extra: object = {}) => ({
  id,
  name: `Conn ${id}`,
  company_id: 'co',
  connection_license_public_key: `0xpub${id}`,
  connection_license_private_key: '0xpriv',
  device_issuance_key: '0xdev',
  status: 'PENDING',
  created_at: '',
  updated_at: '',
  ...extra,
});

describe('connections list', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows an unreadable row instead of failing the page', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        row('a'),
        row('b', { keys_unreadable: false }),
        row('c', {
          keys_unreadable: true,
          connection_license_private_key: null,
          device_issuance_key: null,
        }),
      ],
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConnectionsList />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Conn c')).toBeInTheDocument();
    const cards = document.querySelectorAll('.connection-card');
    expect(cards).toHaveLength(3);
    const third = within(cards[2] as HTMLElement);
    expect(third.getByText(KEYS_UNREADABLE_CHIP)).toBeInTheDocument();
    expect(third.queryByRole('link', { name: 'Finish setup' })).toBeNull();
    expect(third.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
    expect(
      within(cards[0] as HTMLElement).getByRole('link', { name: 'Finish setup' }),
    ).toBeInTheDocument();
    expect(within(cards[0] as HTMLElement).queryByText(KEYS_UNREADABLE_CHIP)).toBeNull();
  });
});
