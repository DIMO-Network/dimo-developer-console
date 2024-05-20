import { render, screen, fireEvent } from '@testing-library/react';

import { SignInButtons } from '@/components/SignInButton';
import { frontendUrl } from '@/config/default';

const replace = window.location.replace;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { replace: jest.fn() },
  });
});

afterEach(() => {
  window.location.replace = replace;
});

describe('SignInButtons', () => {
  it('redirects to the sign with google endpoint', () => {
    window.location.replace = jest.fn();

    render(<SignInButtons isSignIn={true} disabled={false} />);

    const [googleButton] = screen.getAllByText('Sign In');

    fireEvent.click(googleButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${frontendUrl}api/auth/authorize?app=google`
    );
  });

  it('redirects to the sign with github endpoint', () => {
    window.location.replace = jest.fn();

    render(<SignInButtons isSignIn={true} disabled={false} />);

    const [, githubButton] = screen.getAllByText('Sign In');

    fireEvent.click(githubButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${frontendUrl}api/auth/authorize?app=github`
    );
  });

  it('should not redirect to the sign with google endpoint', () => {
    window.location.replace = jest.fn();

    render(<SignInButtons isSignIn={true} disabled />);

    const [googleButton] = screen.getAllByText('Sign In');

    fireEvent.click(googleButton);

    expect(window.location.replace).not.toHaveBeenCalled();
  });
});
