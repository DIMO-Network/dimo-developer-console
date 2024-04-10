import type { FC, LabelHTMLAttributes } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

import './Label.css';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export const Label: FC<LabelProps> = ({
  children,
  className: inputClassName,
  ...props
}) => {
  const className = classnames('label', inputClassName);
  return (
    <label {...props} className={className}>
      {children}
    </label>
  );
};

export default Label;
