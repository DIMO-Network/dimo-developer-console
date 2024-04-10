import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders a button', () => {
    render(
      <Button type="submit" className="primary" role="button">
        Sign in
      </Button>
    );

    const button = screen.getByRole('button');
    const buttonText = screen.getByText('Sign in');

    expect(button).toBeInTheDocument();
    expect(buttonText).toBeInTheDocument();
  });
});
