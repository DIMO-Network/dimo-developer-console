import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/Webhooks/components/StatusBadge';
import React, { FC } from 'react';
import { Webhook } from '@/types/webhook';

const KNOWN_SERVICES = ['signals', 'events'];

interface IProps {
  webhook: Webhook;
}
export const WebhookDetailsCard: FC<IProps> = ({ webhook }) => {
  const t = useTranslations('common');
  return (
    <div className="p-4 bg-control rounded-card grid grid-cols-[max-content_1fr] gap-y-2 gap-x-4">
      <WebhookDetailRow
        label={t('webhooks.details.description')}
        value={webhook.description}
      />
      {webhook.displayName && (
        <WebhookDetailRow
          label={t('webhooks.details.displayName')}
          value={webhook.displayName}
        />
      )}
      <WebhookDetailRow
        label={t('webhooks.details.service')}
        value={
          KNOWN_SERVICES.includes(webhook.service)
            ? t(`webhooks.service.${webhook.service}`)
            : webhook.service
        }
      />
      <WebhookDetailRow
        label={t('webhooks.details.cooldownPeriod')}
        value={t('webhooks.details.cooldownSeconds', { seconds: webhook.coolDownPeriod })}
      />
      <WebhookDetailRow label={t('webhooks.details.url')} value={webhook.targetURL} />
      <WebhookDetailRow
        label={t('webhooks.details.status')}
        value={<StatusBadge status={webhook.status} />}
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
      <span className="text-label text-muted">{label}</span>
      <div className="min-w-0 break-all text-left text-body-sm text-fg">{value}</div>
    </>
  );
};
