import axios from 'axios';
import { render } from '@testing-library/react';

import { useSearchParams } from 'next/navigation';

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
  it('renders the sign in page at the company info form', () => {
    jest.mocked<any>(useSearchParams).mockImplementationOnce(() => ({
      get: jest.fn(() => 'company-information'),
    }));

    const { container } = render(<SignUpPage />);

    expect(container).toMatchSnapshot();
  });
});
