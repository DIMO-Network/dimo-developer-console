import { render, screen } from '@testing-library/react';
import { SummarizeIcon } from '@/components/Icons';

describe('SummarizeIcon', () => {
  it('renders a summarize icon', () => {
    render(<SummarizeIcon className="w-5 h-6" />);

    const summarizeIcon = screen.getByRole('summarize-icon');

    expect(summarizeIcon).toBeInTheDocument();
  });
});
