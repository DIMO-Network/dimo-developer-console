import _ from 'lodash';
import { useState, type FC } from 'react';

import { type IColumn, Column } from './Column';
import { Cell } from './Cell';

import './Table.css';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';

interface IProps {
  columns: IColumn[];
  data: Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: FC<any>[];
  pageInfo?: {
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  onNext?: () => void;
  onPrevious?: () => void;
  totalCount?: number;
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
    <div className={'min-w-full'}>
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

      <div className={'flex flex-row items-center justify-between pt-4'}>
        <p>
          Showing {table.getState().pagination.pageSize} of {rowCount}
        </p>
        <div className={'flex flex-row items-center'}>
          <Button
            className={'table-action-button'}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon className={'w-4 h-4'} />
          </Button>
          <p>{pagination.pageIndex + 1}</p>
          <Button
            className={'table-action-button'}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRightIcon className={'w-4 h-4'} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const Table: FC<IProps> = ({
  columns,
  data,
  actions,
  onNext,
  onPrevious,
  pageInfo,
  totalCount,
}) => {
  const renderColumn = ({ name, label }: IColumn) => {
    return <Column key={`th-${label ?? name}`}>{label ?? name}</Column>;
  };
  // TODO: check that conditional actions access.
  return (
    <div>
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
      <div className={'flex flex-row items-center justify-between pt-4'}>
        <p>
          Showing {data.length} of {totalCount}
        </p>
        <div className={'flex flex-row items-center'}>
          <Button
            className={'table-action-button'}
            disabled={!pageInfo?.hasPreviousPage}
            onClick={onPrevious}
          >
            <ChevronLeftIcon className={'w-4 h-4'} />
          </Button>
          <p>0</p>
          <Button
            className={'table-action-button'}
            disabled={!pageInfo?.hasNextPage}
            onClick={onNext}
          >
            <ChevronRightIcon className={'w-4 h-4'} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Table;
