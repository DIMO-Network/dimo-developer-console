import type { FC } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({
  children,
  className: inputClassName,
}) => {
  const defaultClassNames = ['bg-dark-grey-950', 'p-4', 'rounded-lg'];
  const className = classnames(...defaultClassNames, inputClassName);
  return <div className={className}>{children}</div>;
};

Card.defaultProps = {
  className: '',
};
