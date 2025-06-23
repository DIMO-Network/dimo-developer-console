import React from 'react';
import { useWebhooks } from '@/hooks/queries/useWebhooks';
import { Loader } from '@/components/Loader';
import '../../Table/Table.css';
import { WebhookTableContextProvider } from '@/components/Webhooks/providers/WebhookTableContextProvider';
import { WebhookActionModals } from '@/components/Webhooks/WebhookTable/WebhookActionModals';
import { Table } from '@/components/Webhooks/WebhookTable/Table';

interface WebhookTableProps {
  clientId: string;
}

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
