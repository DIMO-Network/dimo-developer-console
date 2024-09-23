import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

import classnames from 'classnames';

import './TextField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  action?: ReactNode;
}

export type Ref = HTMLInputElement;

export const TextField = forwardRef<Ref, IProps>(
  ({ className: inputClassName = '', action, ...props }, ref) => {
    const className = classnames(inputClassName);
    return (
      <div className="text-field">
      <input className={className} {...props} ref={ref} />
      {action}
    </div>);
  }
);

TextField.displayName = 'TextField';

export default TextField;
