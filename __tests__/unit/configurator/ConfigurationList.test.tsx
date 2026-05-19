import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import * as configurationsActions from '@/actions/configurations';

jest.mock('@/actions/configurations', () => ({
  getConfigurationsByClientId: jest.fn(),
  deleteConfiguration: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockConfigs = [
  { id: 'abc123', configuration_name: 'My Config', entry_state: 'VEHICLE_MANAGER' },
  { id: 'def456', configuration_name: 'Another Config', entry_state: 'EMAIL_INPUT' },
];

describe('ConfigurationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (configurationsActions.getConfigurationsByClientId as jest.Mock).mockResolvedValue(
      mockConfigs,
    );
  });

  it('renders a list of configurations', async () => {
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
      expect(screen.getByText('Another Config')).toBeInTheDocument();
    });
  });

  it('renders empty state when no configurations exist', async () => {
    (configurationsActions.getConfigurationsByClientId as jest.Mock).mockResolvedValue(
      [],
    );
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    await waitFor(() => {
      expect(screen.getByText(/no configurations yet/i)).toBeInTheDocument();
    });
  });

  it('shows confirm UI when delete is clicked', async () => {
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls deleteConfiguration and refreshes on confirm', async () => {
    (configurationsActions.deleteConfiguration as jest.Mock).mockResolvedValue(undefined);
    (configurationsActions.getConfigurationsByClientId as jest.Mock)
      .mockResolvedValueOnce(mockConfigs)
      .mockResolvedValueOnce([mockConfigs[1]]);
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
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
  });

  it('cancels delete when cancel is clicked', async () => {
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });
});
