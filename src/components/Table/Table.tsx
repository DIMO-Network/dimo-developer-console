import { type FC } from 'react';

import { type IColumn, Column } from './Column';
import { Cell } from './Cell';

import './Table.css';

interface IProps {
  columns: IColumn[];
  data: Record<string, string | number | boolean>[];
  actions?: FC[];
}

export const Table: FC<IProps> = ({ columns, data, actions }) => {
  const renderColumn = ({ name }: IColumn) => {
    return <Column>{name}</Column>;
  };

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map(renderColumn)}
          {actions && (
            <th scope="col" className="table-action-column">
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="table-body">
        {data.map((item) => (
          <tr key={item?.id as string}>
            {columns.map(({ name, render }) => {
              const textNode = item[name] ?? '';
              const renderNode = render ? render(item) : null;
              return <Cell key={name}>{renderNode || textNode}</Cell>;
            })}
            {actions && (
              <td className="table-action-cell">
                {actions?.map((action) => action(item))}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
