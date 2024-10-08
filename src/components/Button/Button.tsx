import React, {
  type ReactNode,
  type FC,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from 'react';
import classnames from 'classnames';

import { Loading } from '@/components/Loading';

import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  loadingColor?: string;
}

export const Button: FC<ButtonProps> = ({
  children,
  className: inputClassName,
  loading = false,
  loadingColor = 'black',
  onClick = () => {},
  ...props
}) => {
  const className = classnames('button', inputClassName);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!loading) onClick(e);
  };

  return (
    <button {...props} onClick={handleClick} className={className}>
      {loading && <Loading className={`text-${loadingColor}`} />}
      {!loading && <span className="content">{children}</span>}
    </button>
  );
};

export default Button;
