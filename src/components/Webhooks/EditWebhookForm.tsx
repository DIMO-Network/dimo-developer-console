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
import { getDevJwt } from '@/utils/devJwt';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { NotificationContext } from '@/context/notificationContext';
import { extractCELFromWebhook } from '@/utils/webhook';
import { useRouter } from 'next/navigation';
import { DiscardChangesModal } from '@/app/webhooks/edit/[clientId]/[webhookId]/components/DiscardChangesModal';
import { SubscribedVehicles } from '@/components/Webhooks/edit/SubscribedVehicles';
import { BackButton } from '@/components/BackButton';
import { SubscribedVehiclesPreview } from '@/components/Webhooks/edit/SubscribedVehiclesPreview';

type EditWebhookFormProps = {
  clientId: string;
  webhook: Webhook;
};

enum FormState {
  EDIT_FORM = 'EDIT_FORM',
  SUBSCRIBE_VEHICLES = 'SUBSCRIBE_VEHICLES',
}

export const EditWebhookForm: React.FC<EditWebhookFormProps> = ({
  clientId,
  webhook,
}) => {
  const [formState, setFormState] = useState<FormState>(FormState.EDIT_FORM);
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

  const onSubmit = async (formData: WebhookFormInput) => {
    try {
      const { trigger, data } = await formatAndGenerateCEL(formData.cel);
      await updateWebhook(
        webhook.id,
        { ...formData, data, trigger },
        getDevJwt(clientId) ?? '',
      );
      setNotification('Webhook updated successfully', '', 'success');
      invalidateQuery(clientId);
      reset(formData);
    } catch (err) {
      console.error(err);
      setNotification('Error updating webhook', '', 'error');
    }
  };

  const goToSubscribedVehicles = () => {
    if (isDirty) {
      return setNotification(
        'Please save or discard your changes before proceeding',
        '',
        'error',
      );
    }
    setFormState(FormState.SUBSCRIBE_VEHICLES);
  };
  if (formState === FormState.SUBSCRIBE_VEHICLES) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BackButton onBack={() => setFormState(FormState.EDIT_FORM)} />
          Edit webhook
        </div>
        <SubscribedVehicles webhookId={webhook.id.trim()} clientId={clientId} />
      </div>
    );
  }
  return (
    <FormProvider {...methods}>
      <BackButton onBack={() => onCancel(isDirty)} />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <WebhookDescriptionField />
        <WebhookTargetUriField />
        <WebhookServiceField />
        <CELBuilder />
        <WebhookIntervalField />
        <SubscribedVehiclesPreview
          webhookId={webhook.id}
          clientId={clientId}
          goToSubscribedVehicles={goToSubscribedVehicles}
        />
        <div className="flex w-full gap-4">
          <Button
            type="button"
            className="primary-outline flex-1"
            onClick={() => onCancel(isDirty)}
            disabled={!isDirty}
          >
            Cancel
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
