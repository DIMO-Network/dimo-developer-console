import { render, screen } from '@testing-library/react';
import { BeachAccessIcon } from '@/components/Icons';

describe('BeachAccessIcon', () => {
  it('renders a beach access icon', () => {
    render(<BeachAccessIcon className="w-5 h-6" />);

    const beachAccessIcon = screen.getByRole('beach-access-icon');

    expect(beachAccessIcon).toBeInTheDocument();
  });
});
