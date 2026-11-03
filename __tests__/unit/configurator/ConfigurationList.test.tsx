import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import * as configurationsActions from '@/actions/configurations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/configurations', () => ({
  deleteConfiguration: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';

const mockConfigs = [
  { id: 'abc123', configuration_name: 'My Config', entry_state: 'VEHICLE_MANAGER' },
  { id: 'def456', configuration_name: 'Another Config', entry_state: 'EMAIL_INPUT' },
];

const renderList = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ConfigurationList clientId="0xabc" tokenId={42} />
    </QueryClientProvider>,
  );

const respond = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('ConfigurationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue(respond(mockConfigs));
  });

  it('lists the configurations from the route', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      respond([{ id: 'c1', configuration_name: 'Main', entry_state: 'EMAIL_INPUT' }]),
    );
    renderList();
    expect(await screen.findByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Login with DIMO')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/configurations?clientId=0xabc');
  });

  it('says when the list could not be loaded', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(respond({}, 502));
    renderList();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load configurations. Reload to try again.',
    );
  });

  it('renders a list of configurations', async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
      expect(screen.getByText('Another Config')).toBeInTheDocument();
    });
  });

  it('renders empty state when no configurations exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(respond([]));
    renderList();
    await waitFor(() => {
      expect(screen.getByText(/no configurations yet/i)).toBeInTheDocument();
    });
  });

  it('never reads a failed load as a license with no configurations', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('console-api is down'));
    renderList();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load configurations',
    );
    expect(screen.queryByText(/no configurations yet/i)).not.toBeInTheDocument();
  });

  it('says so when a delete fails, and keeps the row', async () => {
    (configurationsActions.deleteConfiguration as jest.Mock).mockRejectedValue(
      new Error('403'),
    );
    renderList();
    await screen.findByText('My Config');
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to delete the configuration'),
    );
    expect(screen.getByText('My Config')).toBeInTheDocument();
  });

  it('shows confirm UI when delete is clicked', async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('reloads the list after a delete', async () => {
    (configurationsActions.deleteConfiguration as jest.Mock).mockResolvedValue(undefined);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(respond(mockConfigs))
      .mockResolvedValueOnce(respond([mockConfigs[1]]));
    renderList();
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(configurationsActions.deleteConfiguration).toHaveBeenCalledWith({
        id: 'abc123',
      });
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('My Config')).not.toBeInTheDocument());
  });

  it('cancels delete when cancel is clicked', async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });
});
