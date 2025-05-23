import React from 'react';
import clsx from 'clsx';
import { Webhook } from '@/types/webhook';
import { useWebhooks } from '@/hooks/queries/useWebhooks';
import { Loader } from '@/components/Loader';
import { StatusBadge } from '@/components/Webhooks/components/StatusBadge';
import { ExpandedRow } from '@/components/Webhooks/components/ExpandedRow';
import '../Table/Table.css';
import { TestWebhookModal } from '@/components/Webhooks/components/TestWebhookModal';
import { DeleteWebhookModal } from '@/components/Webhooks/components/DeleteWebhookModal';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';
import Cell from '@/components/Table/Cell';
import Column from '@/components/Table/Column';
import { VehicleCount } from '@/components/Webhooks/components/VehicleCount';

interface WebhookTableProps {
  clientId: string;
}

export const WebhookTable: React.FC<WebhookTableProps> = ({ clientId }) => {
  const { data, isLoading, error, refetch } = useWebhooks(clientId);
  const [expandedWebhookId, setExpandedWebhookId] = React.useState<string>();
  const [isTestOpen, setIsTestOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const toggleExpand = (webhookId: string) => {
    setExpandedWebhookId((prev) => (prev === webhookId ? undefined : webhookId));
  };

  const expandedWebhook = data?.find((it) => it.id === expandedWebhookId);

  const columns = React.useMemo<ColumnDef<Webhook>[]>(
    () => [
      { header: 'Description', accessorKey: 'description' },
      { header: 'Service', accessorKey: 'service' },
      { header: 'Setup', accessorKey: 'setup' },
      {
        header: 'Vehicles',
        cell: ({ row }) => (
          <VehicleCount webhookId={row.original.id} clientId={clientId} />
        ),
      },
      { header: 'Errors', accessorKey: 'failure_count' },
      {
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [clientId],
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>There was an error fetching your webhooks</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-text-secondary text-center pb-4">
        You haven’t created any webhooks yet.
      </p>
    );
  }

  return (
    <div className="min-w-full bg-surface-default rounded-xl py-4">
      {expandedWebhook && (
        <TestWebhookModal
          webhook={expandedWebhook}
          isOpen={isTestOpen}
          setIsOpen={setIsTestOpen}
        />
      )}
      {expandedWebhook && (
        <DeleteWebhookModal
          webhook={expandedWebhook}
          isOpen={isDeleteOpen}
          setIsOpen={setIsDeleteOpen}
          onSuccess={() => {
            setIsDeleteOpen(false);
            setExpandedWebhookId(undefined);
            refetch();
          }}
          clientId={clientId}
        />
      )}
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              <th className="w-6" />
              {headerGroup.headers.map((header) => (
                <Column key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </Column>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr
                onClick={() => toggleExpand(row.original.id)}
                className={clsx(
                  'border-t border-t-cta-default transition-colors cursor-pointer',
                  expandedWebhookId === row.original.id && 'bg-surface-sunken',
                )}
              >
                <td className="pl-4 pr-2">
                  {expandedWebhookId === row.original.id ? (
                    <ChevronUpIcon className="h-4 w-4 text-white" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-white" />
                  )}
                </td>
                {row.getVisibleCells().map((cell) => (
                  <Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Cell>
                ))}
              </tr>
              {expandedWebhookId === row.original.id && (
                <ExpandedRow
                  webhook={row.original}
                  clientId={clientId}
                  onTest={() => setIsTestOpen(true)}
                  onDelete={() => setIsDeleteOpen(true)}
                  colSpan={columns.length + 1} /* +1 to handle the chevron icon */
                />
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
