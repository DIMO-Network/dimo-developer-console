import type { FC, PropsWithChildren } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';
import Link, { LinkProps } from 'next/link';

import './Anchor.css';

interface AnchorProps extends PropsWithChildren<LinkProps> {
  children: ReactNode;
  className?: string;
}

export const Anchor: FC<AnchorProps> = ({
  children,
  className: inputClassName,
  ...props
}) => {
  const className = classnames('anchor', inputClassName);
  return (
    <Link {...props} className={className}>
      {children}
    </Link>
  );
};

Anchor.defaultProps = {
  className: '',
};

export default Anchor;
