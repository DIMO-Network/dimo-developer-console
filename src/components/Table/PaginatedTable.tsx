import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Column from '@/components/Table/Column';
import Cell from '@/components/Table/Cell';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';

interface PaginatedTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
}

export function PaginatedTable<T>({ data, columns }: PaginatedTableProps<T>) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <div className="overflow-x-auto min-w-full bg-surface-default rounded-xl p-4">
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
          <tbody>
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
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <p>
          {data.length === 0
            ? 'Showing 0 of 0'
            : `Showing ${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                data.length,
              )} of ${data.length}`}
        </p>
        <div className="flex items-center gap-2">
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
    </>
  );
}
