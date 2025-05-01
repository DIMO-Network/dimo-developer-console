import React from 'react';
import { Webhook } from '@/types/webhook';
import { useWebhooks } from '@/hooks/useWebhooks';
import { Loader } from '@/components/Loader';

import '../Table/Table.css';
import { WebhookTableHeader } from '@/components/Webhooks/WebhookTable/WebhookTableHeader';
import { WebhookTableRow } from '@/components/Webhooks/WebhookTable/WebhookTableRow';
import { ExpandedRow } from '@/components/Webhooks/WebhookTable/ExpandedRow';
import { TestWebhookModal } from '@/components/Webhooks/components/TestWebhookModal';
import { DeleteWebhookModal } from '@/components/Webhooks/components/DeleteWebhookModal';

interface WebhookTableProps {
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
  onTest: (webhook: Webhook) => void;
  clientId: string;
}

const headers = [null, 'Description', 'Service', 'Setup', 'Status'];

export const WebhookTable: React.FC<WebhookTableProps> = ({ clientId }) => {
  const { data, isLoading, error, refetch } = useWebhooks(clientId);
  const [expandedWebhookId, setExpandedWebhookId] = React.useState<string>();
  const [isTestOpen, setIsTestOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const toggleExpand = (webhookId: string) => {
    setExpandedWebhookId((prev) => (prev === webhookId ? undefined : webhookId));
  };

  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>There was an error fetching your webhooks</p>;
  }

  const webhook = data?.find((it) => it.id === expandedWebhookId);

  return (
    <div className="min-w-full bg-surface-default rounded-xl py-4">
      {webhook && (
        <TestWebhookModal
          webhook={webhook}
          isOpen={isTestOpen}
          setIsOpen={setIsTestOpen}
        />
      )}
      {webhook && (
        <DeleteWebhookModal
          webhook={webhook}
          isOpen={isDeleteOpen}
          setIsOpen={setIsDeleteOpen}
          onSuccess={refetch}
        />
      )}
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
              {expandedWebhookId === webhook.id && (
                <ExpandedRow
                  webhook={webhook}
                  clientId={clientId}
                  onTest={() => setIsTestOpen(true)}
                  onDelete={() => setIsDeleteOpen(true)}
                  onEdit={() => {}}
                />
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
