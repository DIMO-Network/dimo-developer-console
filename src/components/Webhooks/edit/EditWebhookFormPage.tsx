import { Webhook, WebhookFormInput } from '@/types/webhook';
import { FormProvider, useForm } from 'react-hook-form';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';
import React from 'react';
import { extractCELFromWebhook } from '@/utils/webhook';
import { useRouter } from 'next/navigation';
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
  const methods = useForm<WebhookFormInput>({
    defaultValues: { ...webhook, cel: extractCELFromWebhook(webhook) },
  });
  const {
    formState: { isDirty },
  } = methods;
  const router = useRouter();

  const goBack = () => {
    router.replace('/webhooks');
  };

  return (
    <FormProvider {...methods}>
      <DiscardChangesModal
        isOpen={isDiscardingChanges}
        onClose={() => setIsDiscardingChanges(false)}
        onConfirm={goBack}
      />
      <BackButton onBack={() => onCancel(isDirty)} />
      <EditWebhookForm webhook={webhook} clientId={clientId} />
    </FormProvider>
  );
};
