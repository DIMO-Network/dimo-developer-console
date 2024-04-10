import type { FC, HTMLAttributes } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export const Label: FC<LabelProps> = ({
  children,
  className: inputClassName,
  ...props
}) => {
  const defaultClassNames = ['flex', 'flex-col', 'gap-2', 'font-medium'];
  const className = classnames(...defaultClassNames, inputClassName);
  return (
    <label {...props} className={className}>
      {children}
    </label>
  );
};

export default Label;
