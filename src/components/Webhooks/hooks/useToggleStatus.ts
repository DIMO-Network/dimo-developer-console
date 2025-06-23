import { Webhook } from '@/types/webhook';
import { useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { updateWebhook } from '@/services/webhook';

export const useToggleStatus = (webhook: Webhook, clientId: string) => {
  const [status, setStatus] = useState<string>(webhook.status);

  const toggleStatus = async () => {
    const newStatus = status === 'Active' ? 'Inactive' : 'Active';
    const token = getDevJwt(clientId);
    if (!token) {
      throw new Error('No devJWT found');
    }
    await updateWebhook(webhook.id, { status: newStatus }, token);
    setStatus(newStatus);
  };

  return {
    status,
    toggleStatus,
  };
};
