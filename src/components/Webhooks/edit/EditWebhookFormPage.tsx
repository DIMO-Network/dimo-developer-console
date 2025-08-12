import { Webhook, WebhookFormInput } from '@/types/webhook';
import { FormProvider, useForm } from 'react-hook-form';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';
import React from 'react';
import { extractCELFromWebhook } from '@/utils/webhook';
import { DiscardChangesModal } from '@/app/webhooks/edit/[clientId]/[webhookId]/components/DiscardChangesModal';
import { BackButton } from '@/components/BackButton';
import { EditWebhookForm } from '@/components/Webhooks/edit/EditWebhookForm';

type EditWebhookFormProps = {
  clientId: string;
  webhook: Webhook;
};
export const EditWebhookFormPage: React.FC<EditWebhookFormProps> = ({
  clientId,
  webhook,
}) => {
  const { isDiscardingChanges, setIsDiscardingChanges, onCancel } =
    useEditWebhookContext();

  // Mapping webhook data to form input format
  const formDefaultValues: WebhookFormInput = {
    service: webhook.service,
    coolDownPeriod: webhook.coolDownPeriod,
    description: webhook.description,
    displayName: webhook.displayName,
    targetURL: webhook.targetURL,
    cel: extractCELFromWebhook(webhook),
  };

  const methods = useForm<WebhookFormInput>({
    defaultValues: formDefaultValues,
  });

  return (
    <FormProvider {...methods}>
      <DiscardChangesModal
        isOpen={isDiscardingChanges}
        onClose={() => setIsDiscardingChanges(false)}
        onConfirm={() => onCancel(false)}
      />
      <BackButton onBack={() => onCancel(methods.formState.isDirty)} />
      <EditWebhookForm webhook={webhook} clientId={clientId} />
    </FormProvider>
  );
};
