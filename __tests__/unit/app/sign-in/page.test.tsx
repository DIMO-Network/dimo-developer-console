import { fireEvent, render, screen } from '@testing-library/react';

import SignInPage from '@/app/sign-in/page';

const replace = window.location.replace;

const { FRONTEND_URL } = process.env;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { replace: jest.fn() },
  });
});

afterEach(() => {
  window.location.replace = replace;
});

describe('SignInPage', () => {
  it('renders the sign in page', () => {
    window.location.replace = jest.fn();

    const { container } = render(<SignInPage />);

    expect(container).toMatchSnapshot();
  });

  it('redirects to the sign with google endpoint', () => {
    window.location.replace = jest.fn();

    render(<SignInPage />);

    const [googleButton] = screen.getAllByText('Sign In');

    fireEvent.click(googleButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${FRONTEND_URL}api/auth/authorize?app=google`
    );
  });

  it('redirects to the sign with github endpoint', () => {
    window.location.replace = jest.fn();

    render(<SignInPage />);

    const [, githubButton] = screen.getAllByText('Sign In');

    fireEvent.click(githubButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${FRONTEND_URL}api/auth/authorize?app=github`
    );
  });
});
