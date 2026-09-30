import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  PaginationState,
  RowData,
  OnChangeFn,
} from '@tanstack/react-table';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { Column } from './Column';
import { Cell } from './Cell';
import './Table.css';
import { useState } from 'react';

declare module '@tanstack/react-table' {
  // A column's className lands on its <th> and every <td>.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

// A column's meta.className lands on its <th> and every <td>, e.g.
// 'hidden md:table-cell' to drop the column on phones.
const columnClass = (def: { meta?: { className?: string } }) => def.meta?.className;

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
  onRowClick?: (row: TData) => void;
  // Names the horizontal scroll region for keyboard and screen reader users.
  label?: string;
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
  onRowClick,
  label = 'Table',
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
      <div
        className={'min-w-full overflow-x-auto rounded-card bg-card p-4'}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Column
                    key={header.id}
                    className={columnClass(header.column.columnDef)}
                  >
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
              <tr
                key={row.id}
                className={`border-t border-outline${onRowClick ? ' cursor-pointer hover:bg-control' : ''}`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <Cell key={cell.id} className={columnClass(cell.column.columnDef)}>
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
            variant="secondary"
            size="icon"
            disabled={!table.getCanPreviousPage() || loading}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon className={'w-4 h-4'} />
          </Button>
          <p>{pagination.pageIndex + 1}</p>
          <Button
            variant="secondary"
            size="icon"
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
