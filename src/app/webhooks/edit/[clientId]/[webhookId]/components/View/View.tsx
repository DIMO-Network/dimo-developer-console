'use client';

import { use, useContext, useState } from 'react';
import { EditWebhookForm } from '@/components/Webhooks/EditWebhookForm';
import { useWebhookById } from '@/hooks/queries/useWebhookById';
import { Loader } from '@/components/Loader';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import { formatAndGenerateCEL, updateWebhook } from '@/services/webhook';
import { uniq } from 'lodash';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { DiscardChangesModal } from '@/app/webhooks/edit/[clientId]/[webhookId]/components/DiscardChangesModal';
import { useRouter } from 'next/navigation';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';

export const View = ({
  params,
}: {
  params: Promise<{ webhookId: string; clientId: string }>;
}) => {
  const { webhookId, clientId } = use(params);
  const [isDiscardChangesModalOpen, setIsDiscardChangesModalOpen] = useState(false);
  const { data, isLoading, error } = useWebhookById({ webhookId, clientId });
  const { setNotification } = useContext(NotificationContext);
  const router = useRouter();
  const extractCELFromWebhook = (webhook: Webhook): WebhookFormInput['cel'] => {
    const { data, trigger } = webhook;

    const operatorRegex = /([=!><]=|[><])/;
    const parts = trigger.split(operatorRegex).map((part) => part.trim());
    const operator = parts[1] ?? '';
    const value = parts[2] ?? '';

    return {
      conditions: [{ field: data, operator, value }],
      operator: 'AND',
    };
  };

  const onCancel = (isDirty?: boolean) => {
    if (isDirty) {
      return setIsDiscardChangesModalOpen(true);
    }
    goBack();
  };

  const onSubmit = async (data: WebhookFormInput) => {
    try {
      const trigger = await formatAndGenerateCEL(data.cel);
      const signals = uniq(data.cel.conditions.map((it) => it.field));
      if (signals.length !== 1) {
        throw new Error('Only one signal is allowed in the webhook trigger');
      }
      await updateWebhook(
        webhookId,
        { ...data, data: signals[0], trigger },
        getDevJwt(clientId) ?? '',
      );
      setNotification('Webhook updated successfully', '', 'success');
      invalidateQuery(clientId);
    } catch (err) {
      console.error(err);
      setNotification('Error updating webhook', '', 'error');
    }
  };

  const goBack = () => {
    router.replace('/webhooks');
  };

  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>There was an error fetching your webhook</p>;
  }
  if (!data) {
    return <p>no webhook found</p>;
  }

  return (
    <>
      <EditWebhookForm
        defaultValues={{ ...data, cel: extractCELFromWebhook(data) }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
      <DiscardChangesModal
        isOpen={isDiscardChangesModalOpen}
        onClose={() => setIsDiscardChangesModalOpen(false)}
        onConfirm={goBack}
      />
    </>
  );
};
