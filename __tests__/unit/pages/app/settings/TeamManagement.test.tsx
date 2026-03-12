import { render, screen } from '@testing-library/react';

import { TeamManagement } from '@/app/settings/components/TeamManagement';

describe('TeamManagement', () => {
  it('renders the team management table', () => {
    const { container } = render(
      <TeamManagement
        refreshData={() => {}}
        teamCollaborators={[
          {
            team_id: '12345',
            status: 'pending',
            User: {
              name: 'John Doe',
              email: 'johndoe@gmail.com',
              auth: 'github',
              auth_login: 'johndoe@gmail.com',
            },
            user_id: '12345',
            role: 'OWNER',
          },
        ]}
      />,
    );

    const nameElm = screen.getByText('John Doe');
    const avatarElm = screen.getByRole('user-avatar');
    const roleElm = screen.getByRole('role-input');

    expect(nameElm).toBeInTheDocument();
    expect(avatarElm).toBeInTheDocument();
    expect(roleElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders the team management table without user', () => {
    const { container } = render(
      <TeamManagement
        refreshData={() => {}}
        teamCollaborators={[
          {
            status: 'pending',
            team_id: '12345',
            user_id: '12345',
            role: 'OWNER',
          },
        ]}
      />,
    );

    const avatarElm = screen.getByRole('user-avatar');
    const roleElm = screen.getByRole('role-input');

    expect(avatarElm).toBeInTheDocument();
    expect(avatarElm.textContent).toBe('');
    expect(roleElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
