import { render, screen } from '@testing-library/react';

import { UserAvatar } from '@/components/UserAvatar';

describe('UserAvatar', () => {
  it('renders an avatar with the user initials', () => {
    render(<UserAvatar name="John Doe" />);

    const initialsText = screen.getByText('JD');

    expect(initialsText).toBeInTheDocument();
  });

  it('renders an avatar with empty value', () => {
    render(<UserAvatar name="" />);

    const initialsElm = screen.getByRole('user-avatar');

    expect(initialsElm).toBeInTheDocument();
    expect(initialsElm.textContent).toBe('');
  });
});
