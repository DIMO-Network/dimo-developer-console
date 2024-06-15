import { type FC, type ReactNode } from 'react';

import './Column.css';

export interface IColumn {
  name: string;
  render?: FC;
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
