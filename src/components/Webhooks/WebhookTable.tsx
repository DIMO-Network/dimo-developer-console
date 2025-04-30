import React from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import { useWebhooksNew } from '@/hooks/useWebhooks';
import { Loader } from '@/components/Loader';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';

import '../Table/Table.css';
import Column from '@/components/Table/Column';
import Cell from '@/components/Table/Cell';
import { Toggle } from '@/components/Toggle';
import classNames from 'classnames';

interface WebhookTableProps {
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
  onTest: (webhook: Webhook) => void;
  clientId: string;
}

export const WebhookTable: React.FC<WebhookTableProps> = ({
  onEdit,
  onDelete,
  onTest,
  clientId,
}) => {
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
    <div className="min-w-full bg-surface-default rounded-xl p-4">
      <table className="table border-separate border-spacing-0">
        <thead className={'table-header'}>
          <tr>
            <th className={'row-border'} />
            <Column className={'row-border'}>Description</Column>
            <Column className={'row-border'}>Service</Column>
            <Column className={'row-border'}>Setup</Column>
            <Column className={'row-border'}>Status</Column>
          </tr>
        </thead>
        <tbody className={'table-body'}>
          {data?.map((webhook) => (
            <React.Fragment key={webhook.id}>
              <tr
                onClick={() => toggleExpand(webhook.id)}
                className={`${expandedWebhookId === webhook.id ? 'bg-surface-sunken' : ''}`}
              >
                <td className={classNames('pl-2 pr-4 align-middle w-4', 'row-border')}>
                  {expandedWebhookId === webhook.id ? (
                    <ChevronUpIcon className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
                  )}
                </td>
                <Cell className={'row-border'}>{webhook.description}</Cell>
                <Cell className={'row-border'}>{webhook.service}</Cell>
                <Cell className={'row-border'}>{webhook.setup}</Cell>
                <Cell className={'row-border'}>{webhook.status}</Cell>
              </tr>
              {expandedWebhookId === webhook.id && (
                <tr className="expanded-row bg-surface-sunken border-t-0">
                  <td colSpan={5}>
                    <div className="expanded-content space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-text-secondary">
                          Webhook URL
                        </label>
                        <input
                          type="text"
                          value={webhook.target_uri}
                          readOnly
                          className="w-full rounded-md bg-cta-default px-3 py-2 text-sm text-text-secondary"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Status</span>
                          <Toggle
                            checked={webhook.status === 'Active'}
                            onToggle={() => {
                              /* TODO - implement editing a webhook's status */
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="primary-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTest(webhook);
                            }}
                          >
                            Test
                          </Button>
                          <Button
                            className="primary-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(webhook);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            className="primary-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(webhook);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
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
