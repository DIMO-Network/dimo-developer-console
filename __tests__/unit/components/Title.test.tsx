import { render, screen } from '@testing-library/react';

import { Title } from '@/components/Title';

describe('Title', () => {
  it('renders a title h1', () => {
    render(<Title>Test</Title>);

    const title = screen.getByText('Test');
    const titleRole = screen.getByRole('h1');

    expect(title).toBeInTheDocument();
    expect(titleRole).toBeInTheDocument();
  });

  it('renders a title h2', () => {
    render(<Title component="h2">Test</Title>);

    const title = screen.getByText('Test');
    const titleRole = screen.getByRole('h2');

    expect(title).toBeInTheDocument();
    expect(titleRole).toBeInTheDocument();
  });
});
