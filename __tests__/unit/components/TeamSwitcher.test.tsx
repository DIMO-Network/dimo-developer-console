import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { TeamSwitcher } from '@/components/TeamSwitcher';

const team = (id: string, name: string, role: 'OWNER' | 'MEMBER') => ({
  id,
  name,
  role,
  companyName: name,
  ownerUserId: 'u',
  ownerEmail: 'o@x.dev',
  ownerAddress: '0x1',
  isPersonal: role === 'OWNER',
});
const PERSONAL = team('t1', 'Harness Motors', 'OWNER');
const ACME = team('t2', 'Acme Mobility', 'MEMBER');
const switchTeam = jest.fn();

describe('TeamSwitcher', () => {
  it('renders nothing for a single team', () => {
    (useTeam as jest.Mock).mockReturnValue({
      teams: [PERSONAL],
      activeTeam: PERSONAL,
      switchTeam,
    });
    const { container } = render(<TeamSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the teams with roles and switches on pick', () => {
    (useTeam as jest.Mock).mockReturnValue({
      teams: [PERSONAL, ACME],
      activeTeam: PERSONAL,
      switchTeam,
    });
    render(<TeamSwitcher />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Team: Harness Motors. Switch team' }),
    );
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByText('Acme Mobility'));
    expect(switchTeam).toHaveBeenCalledWith('t2');
  });

  it('does not reload when the active team is picked again', () => {
    (useTeam as jest.Mock).mockReturnValue({
      teams: [PERSONAL, ACME],
      activeTeam: ACME,
      switchTeam,
    });
    render(<TeamSwitcher collapsed />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Team: Acme Mobility. Switch team' }),
    );
    fireEvent.click(screen.getAllByRole('option')[1].querySelector('button')!);
    expect(switchTeam).not.toHaveBeenCalled();
  });
});
