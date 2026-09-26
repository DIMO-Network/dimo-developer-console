import { StatusBadge } from '@/components/Webhooks/components/StatusBadge';
import React, { FC } from 'react';
import { Webhook } from '@/types/webhook';

interface IProps {
  webhook: Webhook;
}
export const WebhookDetailsCard: FC<IProps> = ({ webhook }) => {
  return (
    <div className="p-4 bg-control rounded-card grid grid-cols-[max-content_1fr] gap-y-2 gap-x-4">
      <WebhookDetailRow label="Description" value={webhook.description} />
      {webhook.displayName && (
        <WebhookDetailRow label="Display name" value={webhook.displayName} />
      )}
      <WebhookDetailRow label="Service" value={webhook.service} />
      <WebhookDetailRow label="Cooldown period" value={`${webhook.coolDownPeriod}s`} />
      <WebhookDetailRow
        label="Webhook URL"
        value={<span className="font-mono text-code break-all">{webhook.targetURL}</span>}
      />
      <WebhookDetailRow label="Status" value={<StatusBadge status={webhook.status} />} />
    </div>
  );
};

const WebhookDetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => {
  return (
    <>
      <span className="text-label text-muted">{label}</span>
      <div className="text-left text-body-sm text-fg">{value}</div>
    </>
  );
};
