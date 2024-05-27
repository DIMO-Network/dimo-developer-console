import { type FC, type ReactNode } from 'react';

import './Title.css';
import classNames from 'classnames';

interface IProps {
  children: ReactNode;
  component?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
}

export const Title: FC<IProps> = ({
  children,
  className = 'text-2xl',
  component: Component = 'h1',
}) => {
  return (
    <Component className={classNames('title', className)} role={Component}>
      {children}
    </Component>
  );
};

export default Title;
