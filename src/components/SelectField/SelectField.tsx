import { InputHTMLAttributes, useState } from 'react';

import classnames from 'classnames';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { ChevronDownIcon } from '@/components/Icons';

import './SelectField.css';

interface IOption {
  value: string;
  text: string;
}

interface IProps<T extends FieldValues> extends InputHTMLAttributes<HTMLSelectElement> {
  className?: string;
  options: IOption[];
  control: Control<T>;
  includeEmptyOption?: boolean;
}

export type Ref = HTMLSelectElement;

// Generic over the form, so any form's control fits (react-hook-form 7.91
// no longer accepts a typed control where Control<any> is expected).
export const SelectField = <T extends FieldValues>({
  className: inputClassName = '',
  options,
  role,
  includeEmptyOption = true,
  control,
  ...props
}: IProps<T>) => {
  const [show, setShow] = useState<boolean>(false);
  const className = classnames('select-field', inputClassName);
  return (
    <Controller
      control={control}
      name={(props.name || '') as Path<T>}
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
                  className={classnames('custom-item', {
                    'selected-item': value === selectedOption,
                  })}
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
};

SelectField.displayName = 'SelectField';

export default SelectField;
