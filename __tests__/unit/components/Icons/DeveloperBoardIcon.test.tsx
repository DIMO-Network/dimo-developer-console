import { render, screen } from '@testing-library/react';
import { DeveloperBoardIcon } from '@/components/Icons';

describe('DeveloperBoardIcon', () => {
  it('renders a developer board icon', () => {
    render(<DeveloperBoardIcon className="w-5 h-6" />);

    const developerBoardIcon = screen.getByRole('developer-board-icon');

    expect(developerBoardIcon).toBeInTheDocument();
  });
});
