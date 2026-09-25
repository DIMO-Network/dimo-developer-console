import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders a button', () => {
    const handleClick = jest.fn();
    render(
      <Button type="submit" className="primary" role="button" onClick={handleClick}>
        Sign in
      </Button>,
    );

    const button = screen.getByRole('button');
    const buttonText = screen.getByText('Sign in');

    expect(button).toBeInTheDocument();
    expect(buttonText).toBeInTheDocument();

    fireEvent.click(button);

    waitFor(() => {
      expect(handleClick).toHaveBeenCalled();
    });
  });
  it('omit onClick function when loading', () => {
    const handleClick = jest.fn();
    render(
      <Button
        type="submit"
        className="primary"
        role="button"
        onClick={handleClick}
        loading={true}
      >
        Sign in
      </Button>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    waitFor(() => {
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  it('is a primary button by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveClass('button', 'primary');
  });

  it.each(['secondary', 'ghost', 'destructive', 'destructive-ghost'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('button', variant);
      expect(button).not.toHaveClass('primary');
    },
  );

  it('keeps extra classes alongside the variant', () => {
    render(
      <Button variant="secondary" className="with-icon w-full">
        Go
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass(
      'button',
      'secondary',
      'with-icon',
      'w-full',
    );
  });
});
