import { Webhook } from '@/types/webhook';
import { useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { updateWebhook } from '@/services/webhook';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';
import { NotificationContext } from '@/context/notificationContext';

export const useToggleStatus = (webhook: Webhook, clientId: string) => {
  const [status, setStatus] = useState<string>(webhook.status);
  const { setNotification } = useContext(NotificationContext);

  const nextStatus = status === 'enabled' ? 'disabled' : 'enabled';

  const toggleStatus = async () => {
    const token = getDevJwt(clientId);
    if (!token) {
      throw new Error('No devJWT found');
    }
    await updateWebhook(webhook.id, { status: nextStatus }, token);
    setStatus(nextStatus);
  };

  const toggleStatusWithConnectedUI = async () => {
    setNotification(`Updating webhook status to ${nextStatus}`, '', 'info');
    try {
      await toggleStatus();
      setNotification('Successfully updated webhook status', '', 'success');
      invalidateQuery(clientId);
    } catch (error) {
      captureException(error);
      setNotification('Failed to update webhook status', '', 'error');
    }
  };

  return {
    status,
    handleChangeStatus: toggleStatusWithConnectedUI,
  };
};
