import { InputHTMLAttributes, forwardRef } from 'react';

import classnames from 'classnames';

import './TextField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export type Ref = HTMLInputElement;

export const TextField = forwardRef<Ref, IProps>(
  ({ className: inputClassName, ...props }, ref) => {
    const className = classnames('text-field', inputClassName);
    return <input className={className} {...props} ref={ref} />;
  }
);

TextField.displayName = 'TextField';

TextField.defaultProps = {
  className: '',
};

export default TextField;
