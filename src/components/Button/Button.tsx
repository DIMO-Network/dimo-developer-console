import React, {
  type ReactNode,
  type FC,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from 'react';
import classnames from 'classnames';

import './Button.css';
import { BubbleLoader } from '@/components/BubbleLoader';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  loadingColor?: string;
}

export const Button: FC<ButtonProps> = ({
  children,
  className: inputClassName,
  loading = false,
  onClick = () => {},
  ...props
}) => {
  const className = classnames('button', inputClassName);

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
