import React from 'react';
import { EditWebhookFormState, Webhook } from '@/types/webhook';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';
import { WebhookVehiclesPage } from '@/components/Webhooks/edit/WebhookVehiclesPage';
import { EditWebhookFormPage } from '@/components/Webhooks/edit/EditWebhookFormPage';

export const EditWebhook = ({
  webhook,
  clientId,
}: {
  webhook: Webhook;
  clientId: string;
}) => {
  const { formState } = useEditWebhookContext();
  if (formState === EditWebhookFormState.SUBSCRIBE_VEHICLES) {
    return <WebhookVehiclesPage webhook={webhook} clientId={clientId} />;
  }
  return <EditWebhookFormPage clientId={clientId} webhook={webhook} />;
};
