import { Webhook } from '@/types/webhook';
import { useWebhookTableContext } from '@/components/Webhooks/providers/WebhookTableContextProvider';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  Row,
  useReactTable,
} from '@tanstack/react-table';
import Column from '@/components/Table/Column';
import React from 'react';
import { ExpandedRow } from '@/components/Webhooks/components/ExpandedRow';
import clsx from 'clsx';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';
import Cell from '@/components/Table/Cell';
import { VehicleCount } from '@/components/Webhooks/components/VehicleCount';
import { StatusBadge } from '@/components/Webhooks/components/StatusBadge';
import { StatusChip } from '@/components/StatusChip';

// Low-priority columns drop out on phones so the status and the row stay on screen.
const PHONE_HIDDEN = 'hidden md:table-cell';
const getColumnClassName = (columnDef: ColumnDef<Webhook>) =>
  (columnDef.meta as { className?: string } | undefined)?.className;

const getColumns = (clientId: string): ColumnDef<Webhook>[] => {
  return [
    { header: 'Description', accessorKey: 'description' },
    {
      header: 'Display name',
      meta: { className: PHONE_HIDDEN },
      cell: ({ row }) => row.original.displayName || '-',
    },
    { header: 'Service', accessorKey: 'service', meta: { className: PHONE_HIDDEN } },
    {
      header: 'Cooldown',
      meta: { className: PHONE_HIDDEN },
      cell: ({ row }) => `${row.original.coolDownPeriod}s`,
    },
    {
      header: 'Vehicles',
      cell: ({ row }) => <VehicleCount webhookId={row.original.id} clientId={clientId} />,
    },
    {
      header: 'Errors',
      accessorKey: 'failure_count',
      cell: ({ row }) => {
        const count = row.original.failure_count;
        return count > 0 ? <StatusChip tone="error">{count}</StatusChip> : count;
      },
    },
    {
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
};
export const WebhooksTable = ({
  webhooks,
  clientId,
}: {
  webhooks: Webhook[];
  clientId: string;
}) => {
  const { toggleExpandedWebhookId, expandedWebhook } = useWebhookTableContext();
  const table = useReactTable({
    data: webhooks,
    columns: getColumns(clientId),
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <table className={'table'}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            <th className="w-6" />
            {headerGroup.headers.map((header) => (
              <Column
                key={header.id}
                className={getColumnClassName(header.column.columnDef)}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </Column>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <React.Fragment key={row.id}>
            <TableRowBasic
              isExpanded={expandedWebhook?.id === row.original.id}
              onClick={() => toggleExpandedWebhookId(row.original.id)}
              row={row}
            />
            {expandedWebhook?.id === row.original.id && (
              <ExpandedRow
                webhook={row.original}
                clientId={clientId}
                colSpan={table.getAllColumns().length + 1}
              />
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};
const TableRowBasic = ({
  isExpanded,
  onClick,
  row,
}: {
  isExpanded: boolean;
  onClick: () => void;
  row: Row<Webhook>;
}) => {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        'border-t border-t-outline transition-colors cursor-pointer',
        isExpanded && 'bg-sheet',
      )}
    >
      <td className="pl-4 pr-2">
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-muted" />
        )}
      </td>
      {row.getVisibleCells().map((cell) => (
        <Cell key={cell.id} className={getColumnClassName(cell.column.columnDef)}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </Cell>
      ))}
    </tr>
  );
};
