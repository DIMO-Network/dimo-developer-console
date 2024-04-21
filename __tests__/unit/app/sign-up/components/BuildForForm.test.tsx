import axios from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { useSearchParams } from 'next/navigation';
import nock from 'nock';

import SignUpPage from '@/app/sign-up/page';

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
  it('renders the sign in page at the build for form', () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'build-for') }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });

  it('renders required action error at build for form', async () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'build-for') }));

    render(<SignUpPage />);

    const continueBtn = screen.getByRole('continue-button');
    fireEvent.click(continueBtn);

    const requiredActionElm = await screen.findByText(
      'Select an option to continue'
    );
    expect(requiredActionElm).toBeInTheDocument();
  });

  it('renders required field error at build for form', async () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'build-for') }));

    render(<SignUpPage />);

    const inputBuildFor = screen.getByRole('build-for-something-else-input');
    fireEvent.click(inputBuildFor);
    const continueBtn = screen.getByRole('continue-button');
    fireEvent.click(continueBtn);

    const requiredActionElm = await screen.findByText('This field is required');
    expect(requiredActionElm).toBeInTheDocument();
  });

  it('renders cleaning field at build for form', async () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'build-for') }));

    render(<SignUpPage />);

    const inputBuildFor = screen.getByRole(
      'build-for-something-else-input'
    ) as HTMLInputElement;
    fireEvent.change(inputBuildFor, { target: { value: 'Test' } });
    const mobileElm = screen.getByText('Mobile app - IOS/Android');
    fireEvent.click(mobileElm);

    expect(inputBuildFor.value).toBe('');
  });

  it('submitting the build for form', async () => {
    jest
      .mocked<any>(useSearchParams)
      .mockImplementationOnce(() => ({ get: jest.fn(() => 'build-for') }));

    nock('http://localhost:3000')
      .persist()
      .intercept('/api/user', 'OPTIONS')
      .reply(200)
      .put('/api/user')
      .reply(200);

    window.location.replace = jest.fn();

    render(<SignUpPage />);

    const mobileElm = screen.getByText('Mobile app - IOS/Android');
    fireEvent.click(mobileElm);

    const continueBtn = screen.getByRole('continue-button');
    fireEvent.click(continueBtn);

    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith('/sign-up')
    );
  });
});
