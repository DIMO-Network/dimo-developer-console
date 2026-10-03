import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ isOwner: false, isLoading: false }),
}));
jest.mock('@/actions/configurations', () => ({
  getConfigurationsByClientId: jest.fn(),
  deleteConfiguration: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
import { getConfigurationsByClientId } from '@/actions/configurations';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';

describe('ConfigurationList for members', () => {
  it('lists configurations without Delete', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([
      { id: 'abc123', configuration_name: 'My Config', entry_state: 'VEHICLE_MANAGER' },
    ]);
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    expect(await screen.findByText('My Config')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('never offers to create the first configuration', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([]);
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    expect(await screen.findByText('No configurations yet.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create your first configuration' }),
    ).toBeNull();
  });
});
