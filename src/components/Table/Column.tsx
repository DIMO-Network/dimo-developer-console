import { type FC, type ReactNode } from 'react';

import './Column.css';
import { cn } from '@/lib/utils';

export interface IColumn {
  label?: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: FC<any>;
  CustomHeader?: ReactNode;
  // Applied to the header <th> and every body <td> of the column, e.g.
  // 'hidden md:table-cell' to drop a column on phones.
  className?: string;
}

interface IProps {
  children: ReactNode;
  className?: string;
}

export const Column: FC<IProps> = ({ children, className }) => {
  return (
    <th scope="col" className={cn('custom-table-column text-left', className)}>
      {children}
    </th>
  );
};

export default Column;
