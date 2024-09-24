import React, { type ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import { TokenInput } from '@/components/TokenInput';

const renderWithForm = (
  ui: React.ReactElement,
  { defaultValues = {} } = {},
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Wrapper: React.FC<{ children: ReactElement<any, any> }> = ({
    children,
  }) => {
    const { control } = useForm({
      defaultValues,
    });
    return <form>{React.cloneElement(children, { control })}</form>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(ui, { wrapper: Wrapper as any });
};

describe('TokenInput', () => {
  it('renders the component', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWithForm(<TokenInput name="dcx" control={null as any} />);
    expect(screen.getByRole('token-value-input')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWithForm(<TokenInput name="dcx" control={null as any} />);
    const input = screen.getByRole('token-value-input');

    fireEvent.change(input, { target: { value: '100' } });
    expect(input).toHaveValue('100');

    fireEvent.change(input, { target: { value: '-10' } });
    expect(input).toHaveValue('0');
  });

  it('handles suggestion button clicks', () => {
    renderWithForm(
      <TokenInput
        name="dcx"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={null as any}
        suggestions={[
          { label: '10k', value: 10000 },
          { label: '100k', value: 100000 },
          { label: '500k', value: 500000 },
          { label: '1M', value: 1000000 },
        ]}
        showControls={true}
      />,
    );

    fireEvent.click(screen.getByText('10k'));
    expect(screen.getByRole('token-value-input')).toHaveValue('10000');

    fireEvent.click(screen.getByText('100k'));
    expect(screen.getByRole('token-value-input')).toHaveValue('100000');

    fireEvent.click(screen.getByText('500k'));
    expect(screen.getByRole('token-value-input')).toHaveValue('500000');

    fireEvent.click(screen.getByText('1M'));
    expect(screen.getByRole('token-value-input')).toHaveValue('1000000');
  });
});
