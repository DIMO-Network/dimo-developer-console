import { render, screen } from '@testing-library/react';
import { GitHubIcon } from '@/components/Icons';

describe('GitHubIcon', () => {
  it('renders a Google icon', () => {
    render(<GitHubIcon className="w-5 h-6" />);

    const gitHubIcon = screen.getByRole('github-icon');

    expect(gitHubIcon).toBeInTheDocument();
  });
});
