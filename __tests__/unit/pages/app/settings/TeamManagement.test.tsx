import { render, screen } from '@testing-library/react';

import { TeamManagement } from '@/app/settings/components/TeamManagement';

jest.mock('@/hooks', () => ({
  useGlobalAccount: () => ({ currentUser: { role: 'OWNER' } }),
}));

describe('TeamManagement', () => {
  it('renders the team management table', () => {
    const { container } = render(
      <TeamManagement
        refreshData={() => {}}
        teamCollaborators={[
          {
            team_id: '12345',
            status: 'PENDING',
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

    expect(screen.getByText('John Doe (Pending)')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders the team management table without user', () => {
    const { container } = render(
      <TeamManagement
        refreshData={() => {}}
        teamCollaborators={[
          {
            status: 'PENDING',
            team_id: '12345',
            user_id: '12345',
            role: 'OWNER',
          },
        ]}
      />,
    );

    expect(screen.getByText('(Pending)')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
