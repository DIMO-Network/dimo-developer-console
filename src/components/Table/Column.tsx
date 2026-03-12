import { type FC, type ReactNode } from 'react';

import './Column.css';
import classNames from 'classnames';

export interface IColumn {
  label?: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: FC<any>;
  CustomHeader?: ReactNode;
}

interface IProps {
  children: ReactNode;
  className?: string;
}

export const Column: FC<IProps> = ({ children, className }) => {
  return (
    <th scope="col" className={classNames('custom-table-column', className)}>
      {children}
    </th>
  );
};

export default Column;
