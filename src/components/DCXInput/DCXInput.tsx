import { FC, forwardRef } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { Control, Controller } from 'react-hook-form';

import './DCXInput.css';

interface IProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any>;
}

export type Ref = HTMLInputElement;

enum SuggestionValues {
  '10K' = 10000,
  '100K' = 100000,
  '500K' = 500000,
  '1M' = 1000000,
}

export const DCXInput: FC<IProps> = forwardRef<Ref, IProps>(
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  ({ name, control }, _ref) => {
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
              <span className="action-icons">
                <MinusIcon className="h-3 w-3 text-white" color="white" />
              </span>
              <input
                className="dcx-value"
                type="number"
                value={currentValue}
                onChange={(e) => {
                  const newValue = handleChange(Number(e.target.value));
                  onChange(newValue);
                }}
                ref={ref}
              />
              <span className="action-icons">
                <PlusIcon className="h-3 w-3 text-white" color="white" />
              </span>
            </div>
            <div className="suggest-values">
              <button
                className="suggestion"
                onClick={() => onChange(SuggestionValues['10K'])}
              >
                10k
              </button>
              <button
                className="suggestion"
                onClick={() => onChange(SuggestionValues['100K'])}
              >
                100k
              </button>
              <button
                className="suggestion"
                onClick={() => onChange(SuggestionValues['500K'])}
              >
                500k
              </button>
              <button
                className="suggestion"
                onClick={() => onChange(SuggestionValues['1M'])}
              >
                1M
              </button>
            </div>
            <p className="dcx-description">1 DCX = $.001 USD</p>
          </div>
        )}
      />
    );
  }
);

DCXInput.displayName = 'DCXInput';

export default DCXInput;
