'use client';
import React, { useState } from 'react';
import classnames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

import './SelectWithChevron.css';

export interface SelectOption {
  value: string | number;
  label: string;
  isPlaceholder?: boolean;
}

interface SelectWithChevronProps {
  options?: SelectOption[];
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  name?: string;
}

export const SelectWithChevron: React.FC<SelectWithChevronProps> = ({
  options = [],
  value = '',
  onChange,
  className = '',
  name,
}) => {
  const [open, setOpen] = useState(false);

  const placeholder = options.find((o) => o.isPlaceholder);
  const selectableOptions = options.filter((o) => !o.isPlaceholder);
  const selected = options.find((o) => o.value === value && !o.isPlaceholder);

  const handleSelect = (optValue: string | number) => {
    setOpen(false);
    if (onChange) {
      onChange({
        target: { value: String(optValue), name: name ?? '' },
      } as React.ChangeEvent<HTMLSelectElement>);
    }
  };

  return (
    <div
      className={classnames('select-field', className)}
      onClick={() => setOpen((o) => !o)}
    >
      <p className={classnames({ selected: Boolean(selected) })}>
        {selected?.label ?? placeholder?.label ?? ''}
      </p>
      <ChevronDownIcon className="w-4 h-4 my-auto" />
      <div className={classnames('custom-menu', { show: open })}>
        {selectableOptions.map(({ value: v, label }) => (
          <div
            key={v}
            className="custom-item"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(v);
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectWithChevron;
