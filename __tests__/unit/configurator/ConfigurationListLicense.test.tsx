import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ isOwner: true, ownerAddress: '0xABC' }),
}));
jest.mock('@/actions/configurations', () => ({
  getConfigurationsByClientId: jest.fn(),
  deleteConfiguration: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
import { getConfigurationsByClientId } from '@/actions/configurations';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';

const show = (owner: string) =>
  render(<ConfigurationList clientId="0xclient" tokenId={42} owner={owner} />);

describe('ConfigurationList for a team owner', () => {
  it('offers Delete on a license their wallet owns', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([
      { id: 'c1', configuration_name: 'Mine', entry_state: 'VEHICLE_MANAGER' },
    ]);
    show('0xabc');
    await screen.findByText('Mine');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('offers no Delete on a license another wallet owns', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([
      { id: 'c1', configuration_name: 'Theirs', entry_state: 'VEHICLE_MANAGER' },
    ]);
    show('0xother');
    await screen.findByText('Theirs');
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('offers no first configuration on a license another wallet owns', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([]);
    show('0xother');
    await screen.findByText('No configurations yet.');
    expect(
      screen.queryByRole('button', { name: 'Create your first configuration' }),
    ).toBeNull();
  });
});
