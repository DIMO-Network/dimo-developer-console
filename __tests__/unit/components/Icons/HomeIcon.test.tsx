import { render, screen } from '@testing-library/react';
import { HomeIcon } from '@/components/Icons';

describe('HomeIcon', () => {
  it('renders a home icon', () => {
    render(<HomeIcon className="w-5 h-6" />);

    const homeIcon = screen.getByRole('home-icon');

    expect(homeIcon).toBeInTheDocument();
  });
});
