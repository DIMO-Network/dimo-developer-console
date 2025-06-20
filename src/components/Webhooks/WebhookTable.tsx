import React, { createContext, useContext } from 'react';
import clsx from 'clsx';
import { Webhook } from '@/types/webhook';
import { invalidateQuery, useWebhooks } from '@/hooks/queries/useWebhooks';
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
  Row,
  useReactTable,
} from '@tanstack/react-table';

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';
import Cell from '@/components/Table/Cell';
import Column from '@/components/Table/Column';
import { VehicleCount } from '@/components/Webhooks/components/VehicleCount';

interface WebhookTableProps {
  clientId: string;
}

interface WebhookTableContextProps {
  expandedWebhookId: string | undefined;
  toggleExpandedWebhookId: (webhookId: string) => void;
  isTestOpen: boolean;
  setIsTestOpen: (isTestOpen: boolean) => void;
  isDeleteOpen: boolean;
  setIsDeleteOpen: (isDeleteOpen: boolean) => void;
  expandedWebhook: Webhook | undefined;
  resetExpandedWebhookId: () => void;
}

export const WebhookTableContext = createContext<WebhookTableContextProps | undefined>(
  undefined,
);

const WebhookTableContextProvider: React.FC<
  React.PropsWithChildren<{ clientId: string }>
> = ({ children, clientId }) => {
  const { data } = useWebhooks(clientId);
  const [expandedWebhookId, setExpandedWebhookId] = React.useState<string>();
  const [isTestOpen, setIsTestOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const toggleExpandedWebhookId = (webhookId: string) => {
    setExpandedWebhookId((cur) => (cur === webhookId ? undefined : webhookId));
  };

  const resetExpandedWebhookId = () => setExpandedWebhookId(undefined);

  const expandedWebhook = expandedWebhookId
    ? (data ?? []).find((webhook) => webhook.id === expandedWebhookId)
    : undefined;

  return (
    <WebhookTableContext.Provider
      value={{
        expandedWebhookId,
        toggleExpandedWebhookId,
        isTestOpen,
        setIsTestOpen,
        isDeleteOpen,
        setIsDeleteOpen,
        expandedWebhook,
        resetExpandedWebhookId,
      }}
    >
      {children}
    </WebhookTableContext.Provider>
  );
};

const useWebhookTableContext = () => {
  const context = useContext(WebhookTableContext);
  if (!context) {
    throw new Error('useWebhookTableContext must be used within a WebhookTableContext');
  }
  return context;
};

export const WebhookTable: React.FC<WebhookTableProps> = ({ clientId }) => {
  const { data, isLoading, error } = useWebhooks(clientId);

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
    <WebhookTableContextProvider clientId={clientId}>
      <div className="min-w-full bg-surface-default rounded-xl py-4">
        <WebhookActionModals clientId={clientId} />
        <Table webhooks={data ?? []} clientId={clientId} />
      </div>
    </WebhookTableContextProvider>
  );
};

const getColumns = (clientId: string): ColumnDef<Webhook>[] => {
  return [
    { header: 'Description', accessorKey: 'description' },
    { header: 'Service', accessorKey: 'service' },
    { header: 'Setup', accessorKey: 'setup' },
    {
      header: 'Vehicles',
      cell: ({ row }) => <VehicleCount webhookId={row.original.id} clientId={clientId} />,
    },
    { header: 'Errors', accessorKey: 'failure_count' },
    {
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
};

const WebhookActionModals = ({ clientId }: { clientId: string }) => {
  const {
    expandedWebhook,
    isTestOpen,
    setIsTestOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    resetExpandedWebhookId,
  } = useWebhookTableContext();

  if (!expandedWebhook) {
    return null;
  }

  return (
    <React.Fragment>
      <TestWebhookModal
        webhook={expandedWebhook}
        isOpen={isTestOpen}
        setIsOpen={setIsTestOpen}
      />
      <DeleteWebhookModal
        webhook={expandedWebhook}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        onSuccess={() => {
          setIsDeleteOpen(false);
          resetExpandedWebhookId();
          invalidateQuery(clientId);
        }}
        clientId={clientId}
      />
    </React.Fragment>
  );
};

const Table = ({ webhooks, clientId }: { webhooks: Webhook[]; clientId: string }) => {
  const { toggleExpandedWebhookId, setIsTestOpen, setIsDeleteOpen, expandedWebhook } =
    useWebhookTableContext();
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
            <TableRowBasic
              isExpanded={expandedWebhook?.id === row.original.id}
              onClick={() => toggleExpandedWebhookId(row.original.id)}
              row={row}
            />
            {expandedWebhook?.id === row.original.id && (
              <ExpandedRow
                webhook={row.original}
                clientId={clientId}
                onTest={() => setIsTestOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
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
        'border-t border-t-cta-default transition-colors cursor-pointer',
        isExpanded && 'bg-surface-sunken',
      )}
    >
      <td className="pl-4 pr-2">
        {isExpanded ? (
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
  );
};
