import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  PaginationState,
  OnChangeFn,
} from '@tanstack/react-table';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { Column } from './Column';
import { Cell } from './Cell';
import './Table.css';
import { useState } from 'react';

interface PaginatedTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  onPaginationChange: (pageChangeArgs: {
    first?: number | null;
    last?: number | null;
    before?: string | null;
    after?: string | null;
  }) => void;
  rowCount: number;
  loading?: boolean;
  pageInfo: { startCursor?: string | null; endCursor?: string | null };
  pageSize: number;
}

/**
 * This paginated table is for use with the Identity API.
 * It's specifically designed to handle Identity API's paginated table structure
 */
export const PaginatedTableIdentityAPI = <TData,>({
  columns,
  data,
  onPaginationChange,
  rowCount,
  loading,
  pageInfo,
  pageSize,
}: PaginatedTableProps<TData>) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });
  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    if (newPagination.pageIndex > pagination.pageIndex) {
      onPaginationChange({
        after: pageInfo.endCursor,
        first: pageSize,
        last: null,
        before: null,
      });
    } else if (newPagination.pageIndex < pagination.pageIndex) {
      onPaginationChange({
        before: pageInfo.startCursor,
        last: pageSize,
        after: null,
        first: null,
      });
    }
    setPagination(newPagination);
  };
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange: handlePaginationChange,
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
          Showing {pagination.pageIndex * pagination.pageSize + 1}–
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, rowCount)} of{' '}
          {rowCount}
        </p>
        <div className={'flex flex-row items-center'}>
          <Button
            className={'table-action-button'}
            disabled={!table.getCanPreviousPage() || loading}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon className={'w-4 h-4'} />
          </Button>
          <p>{pagination.pageIndex + 1}</p>
          <Button
            className={'table-action-button'}
            disabled={!table.getCanNextPage() || loading}
            onClick={() => table.nextPage()}
          >
            <ChevronRightIcon className={'w-4 h-4'} />
          </Button>
        </div>
      </div>
    </div>
  );
};
