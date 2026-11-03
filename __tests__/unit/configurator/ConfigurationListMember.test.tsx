import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ isOwner: false, isLoading: false }),
}));
jest.mock('@/actions/configurations', () => ({
  deleteConfiguration: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderList = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

const respond = (body: unknown, status = 200) =>
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('ConfigurationList for members', () => {
  it('lists configurations without Delete', async () => {
    respond([
      { id: 'abc123', configuration_name: 'My Config', entry_state: 'VEHICLE_MANAGER' },
    ]);
    renderList(<ConfigurationList clientId="0xabc" tokenId={42} />);
    expect(await screen.findByText('My Config')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('never offers to create the first configuration', async () => {
    respond([]);
    renderList(<ConfigurationList clientId="0xabc" tokenId={42} />);
    expect(await screen.findByText('No configurations yet.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create your first configuration' }),
    ).toBeNull();
  });
});
