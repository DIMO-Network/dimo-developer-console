import classNames from 'classnames';
import { InputHTMLAttributes, forwardRef, type FC } from 'react';

import './CheckboxField.css';

export interface IProps extends InputHTMLAttributes<HTMLInputElement> {}

export type Ref = HTMLInputElement;

export const CheckboxField: FC<IProps> = forwardRef<Ref, IProps>(
  ({ className = '', ...props }) => {
    return (
      <input
        {...props}
        type="checkbox"
        className={classNames('checkbox', className)}
      />
    );
  }
);

CheckboxField.displayName = 'TextField';