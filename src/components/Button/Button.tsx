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
  | 'brand'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'destructive-ghost';

// md: the 40px pill. icon: a 32px round icon-only button (pagers, row actions);
// give it a title or aria-label.
export type ButtonSize = 'md' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: FC<ButtonProps> = ({
  children,
  className: inputClassName,
  loading = false,
  variant = 'primary',
  size = 'md',
  onClick = () => {},
  disabled,
  ...props
}) => {
  const className = classnames(
    'button',
    variant,
    size === 'icon' && 'icon',
    inputClassName,
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!loading) onClick(e);
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      onClick={handleClick}
      className={className}
    >
      {loading && <BubbleLoader isSmall isLoading />}
      {!loading && <span className="content">{children}</span>}
    </button>
  );
};

export default Button;
