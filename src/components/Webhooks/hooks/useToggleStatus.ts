import { Webhook } from '@/types/webhook';
import { useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { updateWebhook } from '@/services/webhook';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';
import { toast } from 'sonner';

export const useToggleStatus = (webhook: Webhook, clientId: string) => {
  const [status, setStatus] = useState<string>(webhook.status);

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
    toast.info(`Updating webhook status to ${nextStatus}`);
    try {
      await toggleStatus();
      toast.success('Successfully updated webhook status');
      invalidateQuery(clientId);
    } catch (error) {
      captureException(error);
      toast.error('Failed to update webhook status');
    }
  };

  return {
    status,
    handleChangeStatus: toggleStatusWithConnectedUI,
  };
};
