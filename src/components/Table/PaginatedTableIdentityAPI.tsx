import { useTranslations } from 'next-intl';
import {
  CellData,
  flexRender,
  PaginationState,
  RowData,
  OnChangeFn,
  TableFeatures,
} from '@tanstack/react-table';
import {
  getCoreRowModel,
  LegacyColumnDef,
  useLegacyTable,
} from '@tanstack/react-table/legacy';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { paginationSummary } from './paginationSummary';
import { Column } from './Column';
import { Cell } from './Cell';
import './Table.css';
import { useRef, useState } from 'react';

declare module '@tanstack/react-table' {
  // A column's className lands on its <th> and every <td>.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue extends CellData = CellData,
  > {
    className?: string;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

// A column's meta.className lands on its <th> and every <td>, e.g.
// 'hidden md:table-cell' to drop the column on phones.
const columnClass = (def: { meta?: { className?: string } }) => def.meta?.className;

interface PaginatedTableProps<TData extends RowData> {
  columns: LegacyColumnDef<TData>[];
  data: TData[];
  // May return a promise: the page number moves when it resolves, and stays
  // when it rejects.
  onPaginationChange: (pageChangeArgs: {
    first?: number | null;
    last?: number | null;
    before?: string | null;
    after?: string | null;
  }) => void | Promise<unknown>;
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
export const PaginatedTableIdentityAPI = <TData extends RowData>({
  columns,
  data,
  onPaginationChange,
  rowCount,
  loading,
  pageInfo,
  pageSize,
  onRowClick,
  label,
}: PaginatedTableProps<TData>) => {
  const t = useTranslations('common');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });
  // A page turns when its rows are in. Until then the buttons do nothing (a
  // second click would ask for the same cursor and count a page twice), and
  // a page that fails to load leaves the table where it was.
  // The ref stops a second click in the same tick, before React re-renders;
  // the state disables the buttons.
  const turning = useRef(false);
  const [isTurning, setIsTurning] = useState(false);
  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (turning.current) return;
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    const forward = newPagination.pageIndex > pagination.pageIndex;
    const back = newPagination.pageIndex < pagination.pageIndex;
    if (!forward && !back) {
      setPagination(newPagination);
      return;
    }
    turning.current = true;
    setIsTurning(true);
    // Called inside the chain, so a handler that throws is a failure too.
    Promise.resolve()
      .then(() =>
        onPaginationChange(
          forward
            ? { after: pageInfo.endCursor, first: pageSize, last: null, before: null }
            : { before: pageInfo.startCursor, last: pageSize, after: null, first: null },
        ),
      )
      .then(
        () => setPagination(newPagination),
        () => undefined,
      )
      .finally(() => {
        turning.current = false;
        setIsTurning(false);
      });
  };
  const summary = paginationSummary(pagination.pageIndex, pagination.pageSize, rowCount);
  const table = useLegacyTable({
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
        aria-label={label ?? t('table.label')}
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
        <p>{t(summary.key, summary.values)}</p>
        <div className={'flex flex-row items-center'}>
          <Button
            variant="secondary"
            size="icon"
            disabled={!table.getCanPreviousPage() || loading || isTurning}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon className={'w-4 h-4'} />
          </Button>
          <p>{pagination.pageIndex + 1}</p>
          <Button
            variant="secondary"
            size="icon"
            disabled={!table.getCanNextPage() || loading || isTurning}
            onClick={() => table.nextPage()}
          >
            <ChevronRightIcon className={'w-4 h-4'} />
          </Button>
        </div>
      </div>
    </div>
  );
};
