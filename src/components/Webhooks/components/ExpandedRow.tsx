import { Webhook } from '@/types/webhook';
import { Toggle } from '@/components/Toggle';
import Button from '@/components/Button/Button';
import React, { useState, useCallback, useContext } from 'react';
import { updateWebhook } from '@/services/webhook';
import '../Webhooks.css';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { captureException } from '@sentry/nextjs';
import Link from 'next/link';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';

export const ExpandedRow = ({
  webhook,
  onDelete,
  clientId,
  colSpan,
}: {
  webhook: Webhook;
  clientId: string;
  onTest: () => void;
  onDelete: () => void;
  colSpan: number;
}) => {
  const { setNotification } = useContext(NotificationContext);
  const [status, setStatus] = useState<string>(webhook.status);

  const onToggleStatus = useCallback(async () => {
    const newStatus = status === 'Active' ? 'Inactive' : 'Active';
    try {
      const token = getDevJwt(clientId);
      if (!token) {
        return setNotification('No devJWT found', '', 'error');
      }
      setNotification(`Toggling webhook status to: ${newStatus}...`, '', 'info');
      await updateWebhook(webhook.id, { status: newStatus }, token);
      setStatus(newStatus);
      setNotification('Successfully updated webhook status', '', 'success');
      invalidateQuery(clientId);
    } catch (error) {
      captureException(error);
      setNotification('Failed to update webhook status', '', 'error');
    }
  }, [clientId, setNotification, status, webhook.id]);

  return (
    <tr className="expanded-row bg-surface-sunken border-t-0">
      <td colSpan={colSpan} className={'px-4 pb-4 pt-3 cell-bottom-border'}>
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
              <Toggle checked={status === 'Active'} onToggle={onToggleStatus} />
            </div>
            <div className="flex gap-2">
              {/*<Button className="primary-outline" onClick={onTest}>*/}
              {/*  Test*/}
              {/*</Button>*/}
              <Link href={`/webhooks/edit/${clientId}/${webhook.id.trim()}`}>
                <Button className="primary-outline">Edit</Button>
              </Link>

              <Button className="primary-outline" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};
