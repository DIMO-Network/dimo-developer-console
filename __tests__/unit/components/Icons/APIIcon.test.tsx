import { render, screen } from '@testing-library/react';
import { APIIcon } from '@/components/Icons';

describe('APIIcon', () => {
  it('renders an api icon', () => {
    render(<APIIcon className="w-5 h-6" />);

    const apiIcon = screen.getByRole('api-icon');

    expect(apiIcon).toBeInTheDocument();
  });
});
