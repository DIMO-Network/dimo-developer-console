import { useController, Control, FieldValues, Path } from 'react-hook-form';

import './SegmentedControl.css';

interface SegmentedControlProps<
  T extends string = string,
  F extends FieldValues = FieldValues,
> {
  name?: string;
  control?: Control<F>;
  value?: T;
  onChange?: (value: T) => void;
  options: { value: T; label: string }[];
  role?: string;
}

export function SegmentedControl<
  T extends string = string,
  F extends FieldValues = FieldValues,
>({
  name,
  control,
  value: propValue,
  onChange: propOnChange,
  options,
  role,
}: SegmentedControlProps<T, F>) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rhf = name && control ? useController({ name: name as Path<F>, control }) : null;

  const value = rhf ? rhf.field.value : propValue;
  const onChange = rhf ? rhf.field.onChange : propOnChange;

  return (
    <div className="segmented-control" role={role}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            aria-pressed={selected}
            onClick={() => onChange?.(opt.value)}
            className={`segment ${selected ? 'selected' : ''}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
