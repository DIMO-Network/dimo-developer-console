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

interface PaginatedTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  rowCount: number;
  loading?: boolean;
}

export const PaginatedTable = <TData,>({
  columns,
  data,
  pagination,
  onPaginationChange,
  rowCount,
  loading,
}: PaginatedTableProps<TData>) => {
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
          Showing {Math.min(table.getState().pagination.pageSize, data.length)} of{' '}
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
