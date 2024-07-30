import type { FC, PropsWithChildren, HTMLAttributeAnchorTarget } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';
import Link, { LinkProps } from 'next/link';

import './Anchor.css';

interface AnchorProps extends PropsWithChildren<LinkProps> {
  children: ReactNode;
  className?: string;
  target?: HTMLAttributeAnchorTarget;
}

export const Anchor: FC<AnchorProps> = ({
  children,
  className: inputClassName = '',
  target = '_self',
  ...props
}) => {
  const className = classnames('anchor', inputClassName);
  return (
    <Link {...props} className={className} target={target}>
      {children}
    </Link>
  );
};

export default Anchor;
