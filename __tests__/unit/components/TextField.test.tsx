import { render, screen } from '@testing-library/react';
import { TextField } from '@/components/TextField';

describe('TextField', () => {
  it('renders an input field', () => {
    render(
      <TextField
        placeholder="johndoe@gmail.com"
        type="email"
        name="email"
        role="email"
      />,
    );

    const field = screen.getByRole('email');

    expect(field).toBeInTheDocument();
  });
});
