import React, {
  type ReactNode,
  type FC,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from 'react';
import classnames from 'classnames';

import './Button.css';
import { BubbleLoader } from '@/components/BubbleLoader';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'destructive-ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
}

export const Button: FC<ButtonProps> = ({
  children,
  className: inputClassName,
  loading = false,
  variant = 'primary',
  onClick = () => {},
  ...props
}) => {
  const className = classnames('button', variant, inputClassName);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!loading) onClick(e);
  };

  return (
    <button {...props} onClick={handleClick} className={className}>
      {loading && <BubbleLoader isSmall isLoading />}
      {!loading && <span className="content">{children}</span>}
    </button>
  );
};

export default Button;
