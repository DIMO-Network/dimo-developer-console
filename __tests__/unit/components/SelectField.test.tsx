import { render, screen, fireEvent } from '@testing-library/react';

import { SelectField } from '@/components/SelectField';

describe('SelectField', () => {
  it('renders an selector field', () => {
    render(
      <SelectField
        options={[{ value: 'testing-value', text: 'Testing Text' }]}
        role="selector"
      />
    );

    const fieldContainer = screen.getByRole('selector');

    expect(fieldContainer).toBeInTheDocument();

    fireEvent.click(fieldContainer);

    const options = screen.getAllByText('Testing Text');
    expect(options).toHaveLength(2);

    const [, optionToSelect] = options;
    fireEvent.click(optionToSelect);

    const fieldSelect = screen.getByRole('selector-select');
    const fieldText = screen.getByRole('selector-text');

    expect(fieldSelect).toBeInTheDocument();
    expect((fieldSelect as HTMLSelectElement).value).toBe('testing-value');

    expect(fieldText).toBeInTheDocument();
    expect(fieldText.innerHTML).toBe('Testing Text');
  });
});
