import { render, screen } from '@testing-library/react';
import { GoogleIcon } from '@/components/Icons';

describe('GoogleIcon', () => {
  it('renders a Google icon', () => {
    render(<GoogleIcon className="w-5 h-6" />);

    const googleIcon = screen.getByRole('google-icon');

    expect(googleIcon).toBeInTheDocument();
  });
});
