import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

import classnames from 'classnames';

import './MoneyField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  action?: ReactNode;
}

export type Ref = HTMLInputElement;

export const MoneyField = forwardRef<Ref, IProps>(
  ({ className: inputClassName = '', action, ...props }, ref) => {
    const className = classnames(inputClassName);
    return (
      <div className="money-field">
        <span className="text-white mr-2">$</span>
        <input className={className} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

MoneyField.displayName = 'MoneyField';
