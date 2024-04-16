import { render, screen, fireEvent } from '@testing-library/react';

import { SignInButtons } from '@/components/SignInButton';

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

    render(<SignInButtons isSignIn={true} />);

    const [googleButton] = screen.getAllByText('Sign In');

    fireEvent.click(googleButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/authorize?app=google'
    );
  });

  it('redirects to the sign with github endpoint', () => {
    window.location.replace = jest.fn();

    render(<SignInButtons isSignIn={true} />);

    const [, githubButton] = screen.getAllByText('Sign In');

    fireEvent.click(githubButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/authorize?app=github'
    );
  });
});
