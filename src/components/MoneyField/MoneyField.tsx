import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

import classnames from 'classnames';

import './MoneyField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  action?: ReactNode;
}

export type Ref = HTMLInputElement;

/**
 * MoneyField component is a styled input field for entering monetary values.
 * It includes a dollar sign prefix and an optional action button.
 *
 * @param {IProps} props - The properties for the MoneyField component.
 * @returns {JSX.Element} The rendered MoneyField component.
 */
export const MoneyField = forwardRef<Ref, IProps>(
  ({ className: inputClassName = '', action, ...props }, ref) => {
    const className = classnames(inputClassName);

    // Handle focus event if needed
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      // add input-focused class to the parent div when input is focused and remove it when blurred
      event.currentTarget.parentElement?.classList.add('input-focused');
    };

    // Handle blur event to remove the focused class
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      event.currentTarget.parentElement?.classList.remove('input-focused');
    };

    return (
      <div className="money-field">
        <span className="text-white mr-2">$</span>
        <input
          className={className}
          {...props}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {action}
      </div>
    );
  },
);

MoneyField.displayName = 'MoneyField';
