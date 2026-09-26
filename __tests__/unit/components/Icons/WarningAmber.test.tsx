import { render, screen } from '@testing-library/react';
import { WarningAmberIcon } from '@/components/Icons';

describe('WarningAmberIcon', () => {
  // Decorative: the text next to it carries the meaning.
  it('renders a decorative warning icon hidden from assistive tech', () => {
    const { container } = render(<WarningAmberIcon className="w-5 h-6" />);

    const icon = container.querySelector('svg');

    expect(icon).toHaveClass('w-5', 'h-6');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).not.toHaveAttribute('role');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
