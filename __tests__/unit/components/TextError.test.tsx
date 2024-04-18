import { render, screen } from '@testing-library/react';
import { TextError } from '@/components/TextError';

describe('TextError', () => {
  it('renders an text error', () => {
    render(<TextError errorMessage="Testing error message" />);

    const textElm = screen.getByText('Testing error message');

    expect(textElm).toBeInTheDocument();
  });
});
