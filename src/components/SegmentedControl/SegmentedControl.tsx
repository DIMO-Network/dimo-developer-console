import { useController, Control } from 'react-hook-form';

import './SegmentedControl.css';

interface SegmentedControlProps<T extends string = string> {
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: Control<any>;
  value?: T;
  onChange?: (value: T) => void;
  options: { value: T; label: string }[];
  role?: string;
}

export function SegmentedControl<T extends string = string>({
  name,
  control,
  value: propValue,
  onChange: propOnChange,
  options,
  role,
}: SegmentedControlProps<T>) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rhf = name && control ? useController({ name, control }) : null;

  const value = rhf ? rhf.field.value : propValue;
  const onChange = rhf ? rhf.field.onChange : propOnChange;

  return (
    <div className="segmented-control" role={role}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <div
            key={opt.value}
            onClick={() => onChange?.(opt.value)}
            className={`segment 
              ${selected ? 'selected' : ''}
            `}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}
