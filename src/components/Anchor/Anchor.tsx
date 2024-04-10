import type { FC, AnchorHTMLAttributes } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

import './Anchor.css';

interface AnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

export const Anchor: FC<AnchorProps> = ({
  children,
  className: inputClassName,
  ...props
}) => {
  const className = classnames('anchor', inputClassName);
  return (
    <a {...props} className={className}>
      {children}
    </a>
  );
};

export default Anchor;
