import React from 'react';
import { useWebhooks } from '@/hooks/queries/useWebhooks';
import { Loader } from '@/components/Loader';
import '../../Table/Table.css';
import { WebhookTableContextProvider } from '@/components/Webhooks/providers/WebhookTableContextProvider';
import { ActionModals } from '@/components/Webhooks/WebhookTable/ActionModals';
import { WebhooksTable } from '@/components/Webhooks/WebhookTable/WebhooksTable';

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
      <p className="text-muted text-center pb-4">You haven’t created any webhooks yet.</p>
    );
  }

  return (
    <WebhookTableContextProvider clientId={clientId}>
      {/* Section already supplies the card; overflow-x-auto keeps the table from
          blowing out the page at phone width. */}
      <div className="min-w-full overflow-x-auto">
        <ActionModals clientId={clientId} />
        <WebhooksTable webhooks={data ?? []} clientId={clientId} />
      </div>
    </WebhookTableContextProvider>
  );
};
