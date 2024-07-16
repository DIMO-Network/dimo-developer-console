import _ from 'lodash';
import { type FC } from 'react';

import { type IColumn, Column } from './Column';
import { Cell } from './Cell';

import './Table.css';

interface IProps {
  columns: IColumn[];
  data: Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: FC<any>[];
}

export const Table: FC<IProps> = ({ columns, data, actions }) => {
  const renderColumn = ({ name, label }: IColumn) => {
    return <Column>{label ?? name}</Column>;
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
          <tr key={`column-${item?.id as string}`}>
            {columns.map(({ name, render }) => {
              const textNode = _.get(item, name, '');
              const renderNode = render ? render(item) : null;
              return <Cell key={name}>{renderNode || String(textNode)}</Cell>;
            })}
            {actions && (
              <td
                className="table-action-cell"
                key={`field-${item?.id as string}`}
              >
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
