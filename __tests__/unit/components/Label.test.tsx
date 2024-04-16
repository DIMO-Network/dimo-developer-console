import { render, screen } from '@testing-library/react';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';

describe('Label', () => {
  it('renders an input field', () => {
    render(
      <Label>
        <TextField
          placeholder="johndoe@gmail.com"
          type="email"
          name="email"
          role="email"
        />
      </Label>
    );

    const field = screen.getByRole('email');

    expect(field).toBeInTheDocument();
  });
});
