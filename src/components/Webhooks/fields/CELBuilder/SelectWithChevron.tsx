import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface SelectWithChevronProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string; isPlaceholder?: boolean }[];
}

export const SelectWithChevron: React.FC<SelectWithChevronProps> = ({
  options,
  className = '',
  children,
  ...props
}) => (
  <div className="relative">
    <select
      {...props}
      className={`select-field-input appearance-none pr-10 w-full ${className}`}
    >
      {children ??
        options?.map(({ value, label, isPlaceholder }) => (
          <option key={value} value={value} disabled={isPlaceholder}>
            {label}
          </option>
        ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
      <ChevronDownIcon className="w-4 h-4 my-auto" />
    </div>
  </div>
);
