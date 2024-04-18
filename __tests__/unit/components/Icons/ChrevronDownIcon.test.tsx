import { render, screen } from '@testing-library/react';
import { ChevronDownIcon } from '@/components/Icons';

describe('ChevronDownIcon', () => {
  it('renders a Chevron down icon', () => {
    render(<ChevronDownIcon className="w-5 h-6" />);

    const chevronDownIcon = screen.getByRole('chevron-down-icon');

    expect(chevronDownIcon).toBeInTheDocument();
  });
});
