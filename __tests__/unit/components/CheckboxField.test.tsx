import { render, screen } from '@testing-library/react';
import { CheckboxField } from '@/components/CheckboxField';

describe('CheckboxField', () => {
  it('renders an input field', () => {
    render(<CheckboxField name="terms" />);

    const field = screen.getByRole('checkbox');

    expect(field).toBeInTheDocument();
  });
});
