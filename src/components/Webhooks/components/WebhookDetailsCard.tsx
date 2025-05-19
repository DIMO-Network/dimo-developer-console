import { StatusBadge } from '@/components/Webhooks/components/StatusBadge';
import React, { FC } from 'react';
import classNames from 'classnames';
import { Webhook } from '@/types/webhook';

interface IProps {
  webhook: Webhook;
}
export const WebhookDetailsCard: FC<IProps> = ({ webhook }) => {
  return (
    <div className="p-4 bg-surface-default rounded-2xl grid grid-cols-[max-content_1fr] gap-y-2 gap-x-4">
      <WebhookDetailRow label="Description" value={webhook.description} />
      <WebhookDetailRow label="Service" value={webhook.service} />
      <WebhookDetailRow label="Setup" value={webhook.setup} />
      <WebhookDetailRow label="Webhook URL" value={webhook.target_uri} />
      <WebhookDetailRow
        label="Status"
        value={
          <StatusBadge
            status={webhook.status.toLowerCase() === 'active' ? 'active' : 'inactive'}
          />
        }
      />
    </div>
  );
};

const WebhookDetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => {
  return (
    <>
      <span className="font-medium">{label}</span>
      <div
        className={classNames(
          typeof value === 'string' ? 'text-left text-text-secondary' : '',
        )}
      >
        {value}
      </div>
    </>
  );
};
