import { render, screen, within } from '@testing-library/react';

import { TeamManagement } from '@/app/settings/components/TeamManagement';

// The server action pulls in next/server (Request), which jsdom lacks.
jest.mock('@/actions/team', () => ({ deleteCollaborator: jest.fn() }));
jest.mock('@/hooks', () => ({
  useGlobalAccount: () => ({ currentUser: { role: 'OWNER' } }),
}));

const member = (name: string, role: string, status: string) => ({
  id: name,
  team_id: 't1',
  user_id: name,
  role,
  status,
  email: `${name}@example.com`,
  User: { name, email: `${name}@example.com`, auth: 'github', auth_login: name },
});

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('TeamManagement status chips', () => {
  beforeEach(() => {
    render(
      <TeamManagement
        refreshData={() => {}}
        teamCollaborators={[
          member('Owner Person', 'OWNER', 'ACCEPTED'),
          member('Accepted Person', 'COLLABORATOR', 'ACCEPTED'),
          member('Sent Person', 'COLLABORATOR', 'SENT'),
          member('Odd Person', 'COLLABORATOR', 'EXPIRED'),
        ]}
      />,
    );
  });

  it('shows no invitation chip for the workspace owner', () => {
    const row = rowOf('Owner Person');
    expect(within(row).queryByText(/invitation/i)).not.toBeInTheDocument();
    expect(within(row).queryByText(/accepted/i)).not.toBeInTheDocument();
  });

  it('keeps the chip for collaborators, desktop column and phone chip', () => {
    expect(
      within(rowOf('Accepted Person')).getAllByText('Invitation accepted'),
    ).toHaveLength(2);
    expect(within(rowOf('Sent Person')).getAllByText('Invitation sent')).toHaveLength(2);
  });

  it('never renders an empty chip for an unknown status', () => {
    expect(within(rowOf('Odd Person')).getAllByText('Expired')).toHaveLength(2);
  });

  it('hides the Status column on phones via the column className', () => {
    const header = screen.getByRole('columnheader', { name: 'Status' });
    expect(header).toHaveClass('hidden', 'md:table-cell');
    const cells = rowOf('Sent Person').querySelectorAll('td.hidden.md\\:table-cell');
    expect(cells).toHaveLength(1);
  });
});
