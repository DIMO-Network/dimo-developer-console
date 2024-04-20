import { InputHTMLAttributes, forwardRef, useState } from 'react';

import classnames from 'classnames';

import './SelectField.css';
import { ChevronDownIcon } from '@/components/Icons';

interface IOption {
  value: string;
  text: string;
}

interface IProps extends InputHTMLAttributes<HTMLSelectElement> {
  className?: string;
  options: IOption[];
}

export type Ref = HTMLSelectElement;

export const SelectField = forwardRef<Ref, IProps>(
  ({ className: inputClassName = '', options, role, ...props }, ref) => {
    const [show, setShow] = useState<boolean>(false);
    const [selected, setSelected] = useState<IOption>({ value: '', text: '' });
    const className = classnames('select-field', inputClassName);

    const handleSelection = (value: string, text: string) => {
      setSelected({ value, text });
    };

    return (
      <div className={className} onClick={() => setShow(!show)} role={role}>
        <select
          {...props}
          value={selected.value}
          role={`${role}-select`}
          onChange={() => {}}
          ref={ref}
        >
          {options.map(({ value, text }) => (
            <option value={value} key={value}>
              {text}
            </option>
          ))}
        </select>
        <p role={`${role}-text`}>{selected.text}</p>
        <ChevronDownIcon className="w-4 h-4" />
        <div className={classnames('custom-menu', { show: show })}>
          {options.map(({ value, text }) => (
            <div
              className="custom-item"
              key={value}
              onClick={() => handleSelection(value, text)}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

export default SelectField;
