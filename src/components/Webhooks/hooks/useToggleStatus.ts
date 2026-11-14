import { useTranslations } from 'next-intl';
import { Webhook } from '@/types/webhook';
import { useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { updateWebhook } from '@/services/webhook';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';
import { toast } from 'sonner';

export const useToggleStatus = (webhook: Webhook, clientId: string) => {
  const t = useTranslations('common');
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
    toast.info(t('webhooks.toggle.updating', { status: nextStatus }));
    try {
      await toggleStatus();
      toast.success(t('webhooks.toggle.updated'));
      invalidateQuery(clientId);
    } catch (error) {
      captureException(error);
      toast.error(t('webhooks.toggle.failed'));
    }
  };

  return {
    status,
    handleChangeStatus: toggleStatusWithConnectedUI,
  };
};
