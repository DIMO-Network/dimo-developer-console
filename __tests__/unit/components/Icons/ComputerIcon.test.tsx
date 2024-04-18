import { render, screen } from '@testing-library/react';
import { ComputerIcon } from '@/components/Icons';

describe('ComputerIcon', () => {
  it('renders a Computer icon', () => {
    render(<ComputerIcon className="w-5 h-6" />);

    const computerIcon = screen.getByRole('computer-icon');

    expect(computerIcon).toBeInTheDocument();
  });
});
