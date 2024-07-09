import React, { type ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import { DCXInput } from '@/components/DCXInput';

const renderWithForm = (
  ui: React.ReactElement,
  { defaultValues = {} } = {}
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

describe('DCXInput', () => {
  it('renders the component', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWithForm(<DCXInput name="dcx" control={null as any} />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWithForm(<DCXInput name="dcx" control={null as any} />);
    const input = screen.getByRole('spinbutton');

    fireEvent.change(input, { target: { value: '100' } });
    expect(input).toHaveValue(100);

    fireEvent.change(input, { target: { value: '-10' } });
    expect(input).toHaveValue(0);
  });

  it('handles suggestion button clicks', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWithForm(<DCXInput name="dcx" control={null as any} />);

    fireEvent.click(screen.getByText('10k'));
    expect(screen.getByRole('spinbutton')).toHaveValue(10000);

    fireEvent.click(screen.getByText('100k'));
    expect(screen.getByRole('spinbutton')).toHaveValue(100000);

    fireEvent.click(screen.getByText('500k'));
    expect(screen.getByRole('spinbutton')).toHaveValue(500000);

    fireEvent.click(screen.getByText('1M'));
    expect(screen.getByRole('spinbutton')).toHaveValue(1000000);
  });
});
