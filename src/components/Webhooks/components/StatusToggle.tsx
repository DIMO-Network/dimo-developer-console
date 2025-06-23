import { Webhook } from '@/types/webhook';
import React, { useCallback, useContext } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import { useToggleStatus } from '@/components/Webhooks/hooks/useToggleStatus';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';
import { Toggle } from '@/components/Toggle';

export const StatusToggle = ({
  webhook,
  clientId,
}: {
  webhook: Webhook;
  clientId: string;
}) => {
  const { setNotification } = useContext(NotificationContext);
  const { status, toggleStatus } = useToggleStatus(webhook, clientId);

  const onToggleStatus = useCallback(async () => {
    setNotification(`Updating webhook status`, '', 'info');
    try {
      await toggleStatus();
      setNotification('Successfully updated webhook status', '', 'success');
      invalidateQuery(clientId);
    } catch (error) {
      captureException(error);
      setNotification('Failed to update webhook status', '', 'error');
    }
  }, [clientId, setNotification, toggleStatus]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Status</span>
      <Toggle checked={status === 'Active'} onToggle={onToggleStatus} />
    </div>
  );
};
