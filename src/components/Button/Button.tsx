import type { FC, ButtonHTMLAttributes } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export const Button: FC<ButtonProps> = ({
  children,
  className: inputClassName,
  ...props
}) => {
  const className = classnames('button', inputClassName);
  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
};

export default Button;
