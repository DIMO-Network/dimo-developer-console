import React, { useContext, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import {
  WebhookDescriptionField,
  WebhookServiceField,
  WebhookIntervalField,
  WebhookTargetUriField,
  CELBuilder,
} from '@/components/Webhooks/fields';
import { Button } from '@/components/Button';
import { formatAndGenerateCEL, updateWebhook } from '@/services/webhook';
import { uniq } from 'lodash';
import { getDevJwt } from '@/utils/devJwt';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { NotificationContext } from '@/context/notificationContext';
import { extractCELFromWebhook } from '@/utils/webhook';
import { useRouter } from 'next/navigation';
import { DiscardChangesModal } from '@/app/webhooks/edit/[clientId]/[webhookId]/components/DiscardChangesModal';

type EditWebhookFormProps = {
  clientId: string;
  webhook: Webhook;
};

export const EditWebhookForm: React.FC<EditWebhookFormProps> = ({
  clientId,
  webhook,
}) => {
  const [isDiscardingChanges, setIsDiscardingChanges] = useState(false);
  const { setNotification } = useContext(NotificationContext);
  const methods = useForm<WebhookFormInput>({
    defaultValues: { ...webhook, cel: extractCELFromWebhook(webhook) },
  });
  const {
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
    reset,
  } = methods;
  const router = useRouter();

  const onCancel = (isDirty?: boolean) => {
    if (isDirty) {
      return setIsDiscardingChanges(true);
    }
    goBack();
  };

  const goBack = () => {
    router.replace('/webhooks');
  };

  const onSubmit = async (data: WebhookFormInput) => {
    try {
      const trigger = await formatAndGenerateCEL(data.cel);
      const signals = uniq(data.cel.conditions.map((it) => it.field));
      if (signals.length !== 1) {
        throw new Error('Only one signal is allowed in the webhook trigger');
      }
      await updateWebhook(
        webhook.id,
        { ...data, data: signals[0], trigger },
        getDevJwt(clientId) ?? '',
      );
      setNotification('Webhook updated successfully', '', 'success');
      invalidateQuery(clientId);
      reset(data);
    } catch (err) {
      console.error(err);
      setNotification('Error updating webhook', '', 'error');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <WebhookDescriptionField />
        <WebhookTargetUriField />
        <WebhookServiceField />
        <CELBuilder />
        <WebhookIntervalField />
        <div className="flex w-full gap-4">
          <Button
            type="button"
            className="primary-outline flex-1"
            onClick={() => onCancel(isDirty)}
          >
            {isDirty ? 'Cancel' : 'Go back'}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!isDirty || !isValid}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
      <DiscardChangesModal
        isOpen={isDiscardingChanges}
        onClose={() => setIsDiscardingChanges(false)}
        onConfirm={goBack}
      />
    </FormProvider>
  );
};
