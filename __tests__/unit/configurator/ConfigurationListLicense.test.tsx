import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ isOwner: true, ownerAddress: '0xABC' }),
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

const show = (owner: string) =>
  renderList(<ConfigurationList clientId="0xclient" tokenId={42} owner={owner} />);

describe('ConfigurationList for a team owner', () => {
  it('offers Delete on a license their wallet owns', async () => {
    respond([{ id: 'c1', configuration_name: 'Mine', entry_state: 'VEHICLE_MANAGER' }]);
    show('0xabc');
    await screen.findByText('Mine');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('offers no Delete on a license another wallet owns', async () => {
    respond([{ id: 'c1', configuration_name: 'Theirs', entry_state: 'VEHICLE_MANAGER' }]);
    show('0xother');
    await screen.findByText('Theirs');
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('offers no first configuration on a license another wallet owns', async () => {
    respond([]);
    show('0xother');
    await screen.findByText('No configurations yet.');
    expect(
      screen.queryByRole('button', { name: 'Create your first configuration' }),
    ).toBeNull();
  });
});
