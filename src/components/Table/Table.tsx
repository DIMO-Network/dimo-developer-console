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
    return <Column key={`th-${label ?? name}`}>{label ?? name}</Column>;
  };
 // TODO: check that conditional actions access.
  return (
    <div className={'min-w-full bg-surface-default rounded-xl p-4'}>
      <table className="table">
        <thead>
          <tr>
            {columns.map(renderColumn)}
            {/* {actions && (
              <td className="table-action-cell" key={`field-${item?.id as string}`}>
                {actions?.map((action, index) => action(item, index))}
              </td>
            )} */}
          </tr>
        </thead>
        <tbody className="table-body">
          {data.map((item) => (
            <tr
              key={`column-${item?.id as string}`}
              className={'border-t border-t-cta-default'}
            >
              {columns.map(({ name, render }) => {
                const textNode = _.get(item, name, '');
                const renderNode = render ? render(item) : null;
                return <Cell key={name}>{renderNode || String(textNode)}</Cell>;
              })}
              {actions && (
                <td className="table-action-cell" key={`field-${item?.id as string}`}>
                  {actions?.map((action) => action(item))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
