import { render, screen } from '@testing-library/react';
import { CheckboxField } from '@/components/CheckboxField';

describe('CheckboxField', () => {
  it('renders an input field', () => {
    render(
      <CheckboxField
        name="terms"
        role="terms"
      />
    );

    const field = screen.getByRole('terms');

    expect(field).toBeInTheDocument();
  });
});
