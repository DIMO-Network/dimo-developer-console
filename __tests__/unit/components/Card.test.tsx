import { render, screen } from '@testing-library/react';
import { Card } from '@/components/Card';

describe('Card', () => {
  it('renders a card', () => {
    render(
      <Card>
        <p role="text-content">Another content</p>
      </Card>,
    );

    const textInsideCard = screen.getByRole('text-content');

    expect(textInsideCard).toBeInTheDocument();
  });
});
