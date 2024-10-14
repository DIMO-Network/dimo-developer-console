import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders a button', () => {
    const handleClick = jest.fn();
    render(
      <Button
        type="submit"
        className="primary"
        role="button"
        onClick={handleClick}
      >
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
});
