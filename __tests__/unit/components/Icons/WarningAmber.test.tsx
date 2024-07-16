import { render, screen } from '@testing-library/react';
import { WarningAmberIcon } from '@/components/Icons';

describe('WarningAmberIcon', () => {
  it('renders a warning amber icon', () => {
    render(<WarningAmberIcon className="w-5 h-6" />);

    const supportIcon = screen.getByRole('warning-amber-icon');

    expect(supportIcon).toBeInTheDocument();
  });
});
