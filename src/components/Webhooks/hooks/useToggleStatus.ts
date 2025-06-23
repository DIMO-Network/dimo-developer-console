import { Webhook } from '@/types/webhook';
import { useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { updateWebhook } from '@/services/webhook';

export const useToggleStatus = (webhook: Webhook, clientId: string) => {
  const [status, setStatus] = useState<string>(webhook.status);
  const nextStatus = status === 'Active' ? 'Inactive' : 'Active';

  const toggleStatus = async () => {
    const token = getDevJwt(clientId);
    if (!token) {
      throw new Error('No devJWT found');
    }
    await updateWebhook(webhook.id, { status: nextStatus }, token);
    setStatus(nextStatus);
  };

  return {
    status,
    toggleStatus,
    nextStatus,
  };
};
