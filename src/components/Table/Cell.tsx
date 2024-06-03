import { type FC, type ReactNode } from 'react';

import './Cell.css';

interface IProps {
  children: ReactNode;
}

export const Cell: FC<IProps> = ({ children }) => {
  return <td className="table-cell">{children}</td>;
};

export default Cell;
