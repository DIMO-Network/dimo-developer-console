import { render, screen, fireEvent } from '@testing-library/react';

import { SignInButton } from '@/components/SignInButton';
import { GoogleIcon } from '@/components/Icons';

describe('SignInButton', () => {
  it('renders the provider icon and calls onClick', () => {
    const onClick = jest.fn();

    render(<SignInButton className="sm" Icon={GoogleIcon} onClick={onClick} />);

    const button = screen.getByRole('sign-in-button');
    fireEvent.click(button);

    expect(screen.getByRole('google-icon')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
