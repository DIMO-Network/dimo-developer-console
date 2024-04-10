import type { FC } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({
  children,
  className: inputClassName,
}) => {
  const className = classnames('card', inputClassName);
  return <div className={className}>{children}</div>;
};

Card.defaultProps = {
  className: '',
};
