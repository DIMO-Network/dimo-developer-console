import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NativeSelect } from '@/components/NativeSelect';

describe('NativeSelect', () => {
  const renderSelect = (onChange = jest.fn()) =>
    render(
      <label>
        Interval
        <NativeSelect value="1h" onChange={onChange} name="interval">
          <option value="5m">5 min</option>
          <option value="1h">1 hour</option>
        </NativeSelect>
      </label>,
    );

  it('renders a native select with its options, labelled by its label', () => {
    renderSelect();
    const select = screen.getByLabelText('Interval');
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveValue('1h');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '5 min',
      '1 hour',
    ]);
  });

  it('fires onChange with the chosen value', () => {
    // Read the value inside the handler: React restores a controlled select after it.
    const onChange = jest.fn((e: React.ChangeEvent<HTMLSelectElement>) => e.target.value);
    renderSelect(onChange);
    fireEvent.change(screen.getByLabelText('Interval'), { target: { value: '5m' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.results[0].value).toBe('5m');
  });

  it('draws the Fleet control with a chevron that never takes the click', () => {
    const { container } = renderSelect();
    const select = screen.getByLabelText('Interval');
    expect(select).toHaveClass(
      'appearance-none',
      'bg-control',
      'border-control-border',
      'hover:border-control-border-hover',
      'focus:border-focus-ring',
      'focus:ring-accent-soft',
    );
    const chevron = container.querySelector('svg');
    expect(chevron).not.toBeNull();
    expect(chevron).toHaveClass('pointer-events-none');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards its ref and extra classes', () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <NativeSelect ref={ref} aria-label="Mode" wrapperClassName="w-40" disabled>
        <option>One</option>
      </NativeSelect>,
    );
    expect(ref.current).toBe(screen.getByLabelText('Mode'));
    expect(ref.current).toBeDisabled();
    expect(ref.current?.parentElement).toHaveClass('w-40');
  });
});
