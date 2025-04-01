import _ from 'lodash';
import { useState, type FC } from 'react';

import { type IColumn, Column } from './Column';
import { Cell } from './Cell';

import './Table.css';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

interface IProps {
  columns: IColumn[];
  data: Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: FC<any>[];
}

// Uses tanstack
export const PaginatedTable = ({
  columns,
  data,
  pagination,
  onPaginationChange,
  rowCount,
}) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange,
    state: { pagination },
    rowCount,
  });
  return (
    <div className={'min-w-full bg-surface-default rounded-xl p-4'}>
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Column key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Column>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="table-body">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={'border-t border-t-cta-default'}>
              {row.getVisibleCells().map((cell) => (
                <Cell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Cell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

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
