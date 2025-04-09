import { type FC, type ReactNode } from 'react';

import './Column.css';

export interface IColumn {
  label?: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: FC<any>;
  CustomHeader?: ReactNode;
}

interface IProps {
  children: ReactNode;
}

export const Column: FC<IProps> = ({ children }) => {
  return (
    <th scope="col" className="custom-table-column">
      {children}
    </th>
  );
};

export default Column;
