import React from 'react';
import { Webhook } from '@/types/webhook';
import { useWebhooksNew } from '@/hooks/useWebhooks';
import { Loader } from '@/components/Loader';

import '../Table/Table.css';
import { WebhookTableHeader } from '@/components/Webhooks/WebhookTable/WebhookTableHeader';
import { WebhookTableRow } from '@/components/Webhooks/WebhookTable/WebhookTableRow';
import { ExpandedRow } from '@/components/Webhooks/WebhookTable/ExpandedRow';

interface WebhookTableProps {
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
  onTest: (webhook: Webhook) => void;
  clientId: string;
}

const headers = [null, 'Description', 'Service', 'Setup', 'Status'];

export const WebhookTable: React.FC<WebhookTableProps> = ({ clientId }) => {
  const { data, loading, error } = useWebhooksNew(clientId);
  const [expandedWebhookId, setExpandedWebhookId] = React.useState<string>();
  const toggleExpand = (webhookId: string) => {
    setExpandedWebhookId((prev) => (prev === webhookId ? undefined : webhookId));
  };
  if (loading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>There was an error fetching your webhooks</p>;
  }

  return (
    <div className="min-w-full bg-surface-default rounded-xl py-4">
      <table className="table border-separate border-spacing-0">
        <thead className={'table-header'}>
          <tr>
            {headers.map((header, index) => (
              <WebhookTableHeader key={index}>{header}</WebhookTableHeader>
            ))}
          </tr>
        </thead>
        <tbody className={'table-body'}>
          {data?.map((webhook, index) => (
            <React.Fragment key={webhook.id}>
              <WebhookTableRow
                isLast={index === data?.length - 1}
                webhook={webhook}
                onClick={() => toggleExpand(webhook.id)}
                isExpanded={expandedWebhookId === webhook.id}
              />
              {expandedWebhookId === webhook.id && <ExpandedRow webhook={webhook} />}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
