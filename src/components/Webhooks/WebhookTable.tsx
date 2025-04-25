import React from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import { useWebhooksNew } from '@/hooks/useWebhooks';
import { Loader } from '@/components/Loader';

interface WebhookTableProps {
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
  onTest: (webhook: Webhook) => void;
  expandedWebhook: string | null;
  setExpandedWebhook: React.Dispatch<React.SetStateAction<string | null>>;
  clientId: string;
}

export const WebhookTable: React.FC<WebhookTableProps> = ({
  onEdit,
  onDelete,
  onTest,
  expandedWebhook,
  setExpandedWebhook,
  clientId,
}) => {
  const { data, loading, error } = useWebhooksNew(clientId);
  const toggleExpand = (webhookId: string) => {
    setExpandedWebhook((prev) => (prev === webhookId ? null : webhookId));
  };
  if (loading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>There was an error fetching your webhooks</p>;
  }
  return (
    <div className="webhook-table-container">
      <table className="webhook-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Service</th>
            <th>Target URI</th>
            <th>Status</th>
            <th>Setup</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((webhook) => (
            <React.Fragment key={webhook.id}>
              <tr onClick={() => toggleExpand(webhook.id)}>
                <td>{'Webhook description goes here'}</td>
                <td>{webhook.service}</td>
                <td>{webhook.target_uri}</td>
                <td>{webhook.status}</td>
                <td>{webhook.setup}</td>
                <td className="webhook-actions">
                  <Button
                    className="edit-webhook-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(webhook);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    className="delete-webhook-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(webhook);
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    className="test-webhook-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTest(webhook);
                    }}
                  >
                    Test
                  </Button>
                </td>
              </tr>
              {expandedWebhook === webhook.id && (
                <tr className="expanded-row">
                  <td colSpan={6}>
                    <div className="expanded-content">
                      <h4>CEL Expression</h4>
                      <p>{webhook.trigger}</p>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
