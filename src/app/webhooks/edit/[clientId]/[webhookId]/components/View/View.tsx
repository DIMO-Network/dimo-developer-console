'use client';

import { use } from 'react';
import { EditWebhookForm } from '@/components/Webhooks/EditWebhookForm';
import { useWebhookById } from '@/hooks/queries/useWebhookById';
import { Loader } from '@/components/Loader';
import { Webhook, WebhookFormInput } from '@/types/webhook';

export const View = ({
  params,
}: {
  params: Promise<{ webhookId: string; clientId: string }>;
}) => {
  const { webhookId, clientId } = use(params);
  const { data, isLoading, error } = useWebhookById({ webhookId, clientId });
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
    <EditWebhookForm
      defaultValues={{ ...data, cel: extractCELFromWebhook(data) }}
      onSubmit={() => {}}
    />
  );
};
