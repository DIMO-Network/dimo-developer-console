import { render, screen, fireEvent } from '@testing-library/react';

import { SignInButton } from '@/components/SignInButton';
import { GoogleIcon } from '@/components/Icons';

describe('SignInButton', () => {
  it('renders a sign in button', () => {
    const handlerGitHubLogin = jest.fn();

    render(
      <SignInButton
        className="sm"
        isSignIn={true}
        Icon={GoogleIcon}
        onClick={() => handlerGitHubLogin('google')}
      />
    );

    const button = screen.getByText('Sign In');
    const googleIcon = screen.getByRole('google-icon');

    fireEvent.click(button);

    expect(button).toBeInTheDocument();
    expect(googleIcon).toBeInTheDocument();
    expect(handlerGitHubLogin).toHaveBeenCalledWith('google');
  });
  it('renders a sign up button', () => {
    const handlerGitHubLogin = jest.fn();

    render(
      <SignInButton
        className="sm"
        isSignIn={false}
        Icon={GoogleIcon}
        onClick={() => handlerGitHubLogin('google')}
      />
    );

    const button = screen.getByText('Sign Up');
    const googleIcon = screen.getByRole('google-icon');

    fireEvent.click(button);

    expect(button).toBeInTheDocument();
    expect(googleIcon).toBeInTheDocument();
    expect(handlerGitHubLogin).toHaveBeenCalledWith('google');
  });
});
