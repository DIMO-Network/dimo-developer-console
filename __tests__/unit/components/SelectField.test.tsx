import { render, screen, fireEvent } from '@testing-library/react';
import { useController, useForm } from 'react-hook-form';

import { SelectField } from '@/components/SelectField';

describe('SelectField', () => {
  it('renders an selector field', () => {
    const Component = () => {
      const { control } = useForm<{
        test: string;
      }>();

      const { field } = useController({
        name: 'test',
        control,
      });
      return (
        <SelectField
          {...field}
          control={control}
          options={[{ value: 'testing-value', text: 'Testing Text' }]}
          role="selector"
        />
      );
    };

    render(<Component />);

    const fieldContainer = screen.getByRole('selector');

    expect(fieldContainer).toBeInTheDocument();

    fireEvent.click(fieldContainer);

    const options = screen.getAllByText('Testing Text');
    expect(options).toHaveLength(2);

    const [, optionToSelect] = options;
    fireEvent.click(optionToSelect);

    const fieldText = screen.getByRole('selector-text');

    expect(fieldText).toBeInTheDocument();
    expect(fieldText.innerHTML).toBe('Testing Text');
  });
});
