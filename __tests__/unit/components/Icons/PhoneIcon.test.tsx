import { render, screen } from '@testing-library/react';
import { PhoneIcon } from '@/components/Icons';

describe('PhoneIcon', () => {
  it('renders a phone icon', () => {
    render(<PhoneIcon className="w-5 h-6" />);

    const phoneIcon = screen.getByRole('phone-icon');

    expect(phoneIcon).toBeInTheDocument();
  });
});
