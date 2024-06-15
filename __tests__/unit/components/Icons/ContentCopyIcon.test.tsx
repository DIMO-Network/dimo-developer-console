import { render, screen } from '@testing-library/react';
import { ContentCopyIcon } from '@/components/Icons';

describe('ContentCopyIcon', () => {
  it('renders a content copy icon', () => {
    render(<ContentCopyIcon className="w-5 h-6" />);

    const contentCopyIcon = screen.getByRole('content-copy-icon');

    expect(contentCopyIcon).toBeInTheDocument();
  });
});
