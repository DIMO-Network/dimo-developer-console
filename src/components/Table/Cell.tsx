import { type FC, type ReactNode } from 'react';
import classNames from 'classnames';
import './Cell.css';

interface IProps {
  children: ReactNode;
  className?: string;
}

export const Cell: FC<IProps> = ({ children, className }) => {
  return <td className={classNames('table-cell', className)}>{children}</td>;
};

export default Cell;
