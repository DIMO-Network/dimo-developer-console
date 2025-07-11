import { Webhook } from '@/types/webhook';
import React from 'react';
import '../Webhooks.css';
import { WebhookUrlDisplay } from '@/components/Webhooks/components/WebhookUrlDisplay';
import { StatusToggle } from '@/components/Webhooks/components/StatusToggle';
import { DeleteButton } from '@/components/Webhooks/components/DeleteButton';
import { useToggleStatus } from '@/components/Webhooks/hooks/useToggleStatus';
import { EditButton } from '@/components/Webhooks/components/EditButton';
import { useHandleDeletePress } from '@/components/Webhooks/hooks/useHandleDeletePress';
import { getWebhookEditUrl } from '@/components/Webhooks/utils';

export const ExpandedRow = ({
  webhook,
  clientId,
  colSpan,
}: {
  webhook: Webhook;
  clientId: string;
  colSpan: number;
}) => {
  const { status, handleChangeStatus } = useToggleStatus(webhook, clientId);
  const handleDeletePress = useHandleDeletePress();

  return (
    <tr className="expanded-row bg-surface-sunken border-t-0">
      <td colSpan={colSpan} className={'px-4 pb-4 pt-3 cell-bottom-border'}>
        <div className="expanded-content space-y-4">
          <WebhookUrlDisplay url={webhook.target_uri} />
          <Actions
            onDelete={handleDeletePress}
            onChangeStatus={handleChangeStatus}
            isActive={status === 'Active'}
            editUrl={getWebhookEditUrl(webhook, clientId)}
          />
        </div>
      </td>
    </tr>
  );
};

const Actions = ({
  onDelete,
  isActive,
  onChangeStatus,
  editUrl,
}: {
  onDelete: () => void;
  isActive: boolean;
  onChangeStatus: () => void;
  editUrl: string;
}) => {
  return (
    <div className="flex items-center justify-between">
      <StatusToggle isActive={isActive} onToggleStatus={onChangeStatus} />
      <div className="flex gap-2">
        <EditButton editUrl={editUrl} />
        <DeleteButton onDelete={onDelete} />
      </div>
    </div>
  );
};
