import { InputHTMLAttributes, forwardRef, useState } from 'react';

import classnames from 'classnames';
import { Control, Controller } from 'react-hook-form';

import { ChevronDownIcon } from '@/components/Icons';

import './SelectField.css';

interface IOption {
  value: string;
  text: string;
}

interface IProps extends InputHTMLAttributes<HTMLSelectElement> {
  className?: string;
  options: IOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any>;
  includeEmptyOption?: boolean;
}

export type Ref = HTMLSelectElement;

export const SelectField = forwardRef<Ref, IProps>(
  (
    {
      className: inputClassName = '',
      options,
      role,
      includeEmptyOption = true,
      control,
      ...props
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ref,
  ) => {
    const [show, setShow] = useState<boolean>(false);
    const className = classnames('select-field', inputClassName);
    return (
      <Controller
        control={control}
        name={props.name || ''}
        render={({ field: { onChange, value: selectedOption, ref } }) => {
          const selectedOptionData = options.find(
            (item) => item.value === selectedOption,
          ) ?? {
            value: '',
            text: '',
          };

          return (
            <div className={className} onClick={() => setShow(!show)} role={role}>
              <select {...props} value={selectedOption} role={`${role}-select`} ref={ref}>
                {includeEmptyOption && <option></option>}
                {options.map(({ value, text }) => (
                  <option value={value} key={value}>
                    {text}
                  </option>
                ))}
              </select>
              <p
                className={classnames({
                  selected: Boolean(selectedOptionData.value),
                })}
                role={`${role}-text`}
              >
                {selectedOptionData.text || props.placeholder || ''}
              </p>
              <ChevronDownIcon className="w-4 h-4 my-auto" />
              <div className={classnames('custom-menu', { show: show })}>
                {options.map(({ value, text }) => (
                  <div
                    className="custom-item"
                    key={value}
                    onClick={() => {
                      onChange(value);
                      setShow(false);
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      />
    );
  },
);

SelectField.displayName = 'SelectField';

export default SelectField;
