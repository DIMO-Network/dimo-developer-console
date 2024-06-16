import { render, screen } from '@testing-library/react';

import { UserAvatar } from '@/components/UserAvatar';

describe('UserAvatar', () => {
  it('renders an avatar with the user initials', () => {
    render(
      <UserAvatar
        user={{
          name: 'John Doe',
          email: 'jhondoe@gmail.com',
          auth: 'github',
          auth_login: 'jhondoe@gmail.com',
        }}
      />
    );

    const initialsText = screen.getByText('JD');

    expect(initialsText).toBeInTheDocument();
  });

  it('renders an avatar with empty value', () => {
    render(<UserAvatar />);

    const initialsElm = screen.getByRole('user-avatar');

    expect(initialsElm).toBeInTheDocument();
    expect(initialsElm.textContent).toBe('');
  });
});
