import _ from 'lodash';
import { type FC } from 'react';

import { Column, type IColumn } from './Column';
import { Cell } from './Cell';

import './Table.css';

interface IProps {
  columns: IColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: FC<any>[];
}

export const Table: FC<IProps> = ({ columns, data, actions }) => {
  const renderColumn = ({ name, label, CustomHeader }: IColumn) => {
    if (CustomHeader) {
      return CustomHeader;
    }
    return <Column key={`th-${label ?? name}`}>{label ?? name}</Column>;
  };
  // TODO: check that conditional actions access.
  return (
    <div className={'min-w-full bg-surface-default rounded-xl p-4'}>
      <table className="table">
        <thead className="table-header">
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
          {data.map((item, index) => (
            <tr key={`row-${index}`} className={'border-t border-t-cta-default'}>
              {columns.map(({ name, render }) => {
                const textNode = _.get(item, name, '');
                const renderNode = render ? render(item) : null;
                return <Cell key={name}>{renderNode || String(textNode)}</Cell>;
              })}
              {actions && (
                <td className="table-action-cell" key={`row-action-cell-${index}`}>
                  {actions?.map((action, index) => action(item, index))}
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
