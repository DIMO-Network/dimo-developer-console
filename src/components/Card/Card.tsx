'use client';
import type { FC } from 'react';

import React, { HTMLAttributes, ReactNode } from 'react';
import classnames from 'classnames';

import './Card.css';

// Extra attributes (role, aria-*) pass through so a clickable card can
// expose its state, e.g. role="radio" aria-checked.
interface CardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onClick' | 'className'
> {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Card: FC<CardProps> = ({
  children,
  onClick = () => {},
  className: inputClassName = '',
  ...rest
}) => {
  const className = classnames('card', inputClassName);
  return (
    <div {...rest} className={className} onClick={onClick}>
      {children}
    </div>
  );
};
