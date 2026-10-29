import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import './TokenInput.css';
import { formatSimpleBalanceWithDigits } from '@/utils/formatBalance';

interface ISuggestion {
  label: string | number;
  value: number;
}

interface IProps<T extends FieldValues> {
  name: string;
  control: Control<T>;
  suggestions?: ISuggestion[];
  showControls?: boolean;
  description?: string;
}

export type Ref = HTMLInputElement;

// Generic over the form, so any form's control fits.
export const TokenInput = <T extends FieldValues>({
  name,
  control,
  suggestions = [],
  showControls = false,
  description = '',
}: IProps<T>) => {
  const handleChange = (newValue: number) => {
    if (newValue < 0) return 0;
    return newValue;
  };

  const formatValue = (value: number) => {
    return formatSimpleBalanceWithDigits(value, 0);
  };

  return (
    <Controller
      control={control}
      name={name as Path<T>}
      render={({ field: { onChange, value: currentValue, ref } }) => (
        <div className="dcx-input">
          <div className="dcx-container">
            {showControls && (
              <button
                className="action-icons"
                type="button"
                onClick={() => onChange(handleChange(currentValue - 1))}
              >
                <MinusIcon className="h-3 w-3 text-ink" />
              </button>
            )}
            <div className="amount-container">
              <input
                className="dcx-value"
                type="text"
                value={formatValue(currentValue)}
                onChange={(e) => {
                  const textValue = (e.target.value || '0').replace(/,/g, '');
                  const newValue = handleChange(parseInt(textValue, 10));
                  onChange(newValue);
                }}
                role="token-value-input"
                ref={ref}
              />
              {description && <span className="description">{description}</span>}
            </div>
            {showControls && (
              <button
                className="action-icons"
                type="button"
                onClick={() => onChange(handleChange(currentValue + 1))}
              >
                <PlusIcon className="h-3 w-3 text-ink" />
              </button>
            )}
          </div>
          <div className="suggest-values">
            {suggestions.map(({ label, value }) => (
              <button key={label} className="suggestion" onClick={() => onChange(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    />
  );
};

TokenInput.displayName = 'TokenInput';

export default TokenInput;
