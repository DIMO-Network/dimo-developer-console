/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';

import SignInPage from '@/app/sign-in/page';
import { frontendUrl } from '@/config/default';

const replace = window.location.replace;

jest.mock('next/navigation');

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
    jest
      .mocked<any>(useSearchParams)
      .mockImplementation(() => ({ get: jest.fn(() => null) }));

    const { container } = render(<SignInPage />);

    expect(container).toMatchSnapshot();
  });

  it('redirects to the sign with google endpoint', () => {
    window.location.replace = jest.fn();

    jest
      .mocked<any>(useSearchParams)
      .mockImplementation(() => ({ get: jest.fn(() => null) }));

    render(<SignInPage />);

    const [googleButton] = screen.getAllByText('Sign In');

    fireEvent.click(googleButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${frontendUrl}api/auth/authorize?app=google`
    );
  });

  it('redirects to the sign with github endpoint', () => {
    window.location.replace = jest.fn();

    jest
      .mocked<any>(useSearchParams)
      .mockImplementation(() => ({ get: jest.fn(() => null) }));

    render(<SignInPage />);

    const [, githubButton] = screen.getAllByText('Sign In');

    fireEvent.click(githubButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${frontendUrl}api/auth/authorize?app=github`
    );
  });

  it('should render an error toast', async () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementation(() => ({ get: jest.fn(() => 'unique_email') }));

    render(<SignInPage />);
    const toastElm = await screen.findByText('The email is already registered');

    expect(toastElm).toBeInTheDocument();
  });
});
