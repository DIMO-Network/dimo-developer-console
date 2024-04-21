import axios from 'axios';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';

import SignUpPage from '@/app/sign-up/page';
import { regions } from '@/config/default';
import nock from 'nock';

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
  it('renders the sign in page at the company info form', () => {
    jest.mocked<any>(useSearchParams).mockImplementationOnce(() => ({
      get: jest.fn(() => 'company-information'),
    }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });

  it('renders wrong url message at build for form', async () => {
    jest.mocked<any>(useSearchParams).mockImplementationOnce(() => ({
      get: jest.fn(() => 'company-information'),
    }));

    render(<SignUpPage />);

    const inputBuildFor = screen.getByRole(
      'company-website-input'
    ) as HTMLInputElement;
    const finishBtn = screen.getByRole('finish-button');
    fireEvent.change(inputBuildFor, { target: { value: 'test' } });
    fireEvent.click(finishBtn);

    const messageElm = await screen.findByText(
      'This field must be a valid URL'
    );

    expect(messageElm).toBeInTheDocument();
  });

  it('submitting the build for form', async () => {
    jest.mocked<any>(useSearchParams).mockImplementationOnce(() => ({
      get: jest.fn(() => 'company-information'),
    }));

    nock('http://localhost:3000')
      .persist()
      .intercept('/api/user', 'OPTIONS')
      .reply(200)
      .put('/api/user')
      .reply(200);

    window.location.replace = jest.fn();

    render(<SignUpPage />);

    const regionContainer = screen.getByRole(
      'company-region'
    ) as HTMLInputElement;
    fireEvent.click(regionContainer);

    const [, optionElm] = await screen.findAllByText(regions[0]);
    fireEvent.click(optionElm);

    const finishBtn = screen.getByRole('finish-button');
    fireEvent.click(finishBtn);

    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith('/sign-up')
    );
  });
});
