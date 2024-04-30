/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { fireEvent, render, screen } from '@testing-library/react';

import { useSearchParams } from 'next/navigation';

import SignUpPage from '@/app/sign-up/page';
import { frontendUrl } from '@/config/default';

jest.mock('next/navigation');

const replace = window.location.replace;

axios.defaults.adapter = 'http';

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { replace: jest.fn() },
  });
});

afterEach(() => {
  window.location.replace = replace;
});

describe('SignUpPage', () => {
  it('renders the sign in page', () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => null) }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });

  it('renders the sign in page at the sign up with form', () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'sign-up-with') }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });

  it('renders the sign in page with wrong flow', () => {
    jest.mocked<any>(useSearchParams).mockImplementationOnce(() => ({
      get: jest.fn(() => 'unexpected-flow'),
    }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });

  it('redirects to the sign with google endpoint', () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'sign-up-with') }));

    window.location.replace = jest.fn();

    render(<SignUpPage />);

    const [googleButton] = screen.getAllByText('Sign Up');

    fireEvent.click(googleButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${frontendUrl}api/auth/authorize?app=google`
    );
  });

  it('redirects to the sign with github endpoint', () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'sign-up-with') }));

    window.location.replace = jest.fn();

    render(<SignUpPage />);

    const [, githubButton] = screen.getAllByText('Sign Up');

    fireEvent.click(githubButton);

    expect(window.location.replace).toHaveBeenCalledWith(
      `${frontendUrl}api/auth/authorize?app=github`
    );
  });

  it('renders the sign in page at the company info form', () => {
    jest.mocked<any>(useSearchParams).mockImplementationOnce(() => ({
      get: jest.fn(() => 'company-information'),
    }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });
});
