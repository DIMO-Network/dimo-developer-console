import classNames from 'classnames';
import { InputHTMLAttributes, forwardRef, type FC } from 'react';

import './CheckboxField.css';

//export interface IProps extends InputHTMLAttributes<HTMLInputElement> {}

export type Ref = HTMLInputElement;

export const CheckboxField: FC<InputHTMLAttributes<HTMLInputElement>> = forwardRef<
  Ref,
  InputHTMLAttributes<HTMLInputElement>
>(({ className = '', ...props }, ref) => {
  return (
    <input
      {...props}
      type="checkbox"
      className={classNames('checkbox', className)}
      ref={ref}
    />
  );
});

CheckboxField.displayName = 'TextField';
