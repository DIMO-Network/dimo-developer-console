import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import React from 'react';
import '../Webhooks.css';
import Link from 'next/link';
import { WebhookUrlDisplay } from '@/components/Webhooks/components/WebhookUrlDisplay';
import { StatusToggle } from '@/components/Webhooks/components/StatusToggle';
import { DeleteButton } from '@/components/Webhooks/components/DeleteButton';

const getWebhookEditUrl = (webhook: Webhook, clientId: string) => {
  return `/webhooks/edit/${clientId}/${webhook.id.trim()}`;
};

export const ExpandedRow = ({
  webhook,
  clientId,
  colSpan,
}: {
  webhook: Webhook;
  clientId: string;
  colSpan: number;
}) => {
  return (
    <tr className="expanded-row bg-surface-sunken border-t-0">
      <td colSpan={colSpan} className={'px-4 pb-4 pt-3 cell-bottom-border'}>
        <div className="expanded-content space-y-4">
          <WebhookUrlDisplay url={webhook.target_uri} />
          <Actions webhook={webhook} clientId={clientId} />
        </div>
      </td>
    </tr>
  );
};

const EditButton = ({ webhook, clientId }: { webhook: Webhook; clientId: string }) => {
  return (
    <Link href={getWebhookEditUrl(webhook, clientId)}>
      <Button className="primary-outline">Edit</Button>
    </Link>
  );
};

const Actions = ({ webhook, clientId }: { webhook: Webhook; clientId: string }) => {
  return (
    <div className="flex items-center justify-between">
      <StatusToggle webhook={webhook} clientId={clientId} />
      <div className="flex gap-2">
        <EditButton webhook={webhook} clientId={clientId} />
        <DeleteButton webhook={webhook} clientId={clientId} />
      </div>
    </div>
  );
};
