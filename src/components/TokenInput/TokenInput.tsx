import { FC, forwardRef } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { Control, Controller } from 'react-hook-form';

import './TokenInput.css';

interface ISuggestion {
  label: string | number;
  value: number;
}

interface IProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any>;
  suggestions?: ISuggestion[];
  showControls?: boolean;
  description?: string;
}

export type Ref = HTMLInputElement;

export const TokenInput: FC<IProps> = forwardRef<Ref, IProps>(
  (
    { name, control, suggestions = [], showControls = false, description = '' },
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    _ref,
  ) => {
    const handleChange = (newValue: number) => {
      if (newValue < 0) return 0;
      return newValue;
    };

    return (
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value: currentValue, ref } }) => (
          <div className="dcx-input">
            <div className="dcx-container">
              {showControls && (
                <button
                  className="action-icons"
                  type="button"
                  onClick={() => onChange(handleChange(currentValue - 1))}
                >
                  <MinusIcon className="h-3 w-3 text-white" color="white" />
                </button>
              )}
              <div className="amount-container">
                <input
                  className="dcx-value"
                  type="text"
                  value={Number(currentValue)}
                  onChange={(e) => {
                    const newValue = handleChange(
                      parseInt(e.target.value || '0', 10),
                    );
                    onChange(newValue);
                  }}
                  role="token-value-input"
                  ref={ref}
                />
                {description && (
                  <span className="description">{description}</span>
                )}
              </div>
              {showControls && (
                <button
                  className="action-icons"
                  type="button"
                  onClick={() => onChange(handleChange(currentValue + 1))}
                >
                  <PlusIcon className="h-3 w-3 text-white" color="white" />
                </button>
              )}
            </div>
            <div className="suggest-values">
              {suggestions.map(({ label, value }) => (
                <button
                  key={label}
                  className="suggestion"
                  onClick={() => onChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      />
    );
  },
);

TokenInput.displayName = 'TokenInput';

export default TokenInput;
