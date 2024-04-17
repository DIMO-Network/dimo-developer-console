import type { FC } from 'react';

import React, { ReactNode } from 'react';
import classnames from 'classnames';

import './Card.css';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Card: FC<CardProps> = ({
  children,
  onClick = () => {},
  className: inputClassName = '',
}) => {
  const className = classnames('card', inputClassName);
  return (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  );
};
