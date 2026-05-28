import { Button } from '@/components/Button';
import React from 'react';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import { useFormContext } from 'react-hook-form';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';
import { toast } from 'sonner';
import { getDevJwt } from '@/utils/devJwt';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';
import {
  CELBuilder,
  WebhookDescriptionField,
  WebhookDisplayNameField,
  WebhookCooldownField,
  WebhookServiceField,
  WebhookTargetUriField,
} from '@/components/Webhooks/fields';
import { WebhookVehicles } from '@/components/Webhooks/edit/WebhookVehicles';

export const EditWebhookForm = ({
  webhook,
  clientId,
}: {
  webhook: Webhook;
  clientId: string;
}) => {
  const {
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useFormContext<WebhookFormInput>();
  const { onCancel, submitForm } = useEditWebhookContext();

  const onSubmit = async (formData: WebhookFormInput) => {
    try {
      await submitForm(formData, webhook, getDevJwt(clientId) ?? '');
      toast.success('Webhook updated successfully');
      invalidateQuery(clientId);
      reset(formData);
    } catch (err) {
      captureException(err);
      toast.error('Error updating webhook');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <WebhookDescriptionField />
      <WebhookDisplayNameField />
      <WebhookTargetUriField />
      <WebhookServiceField />
      <CELBuilder />
      <WebhookCooldownField />
      <WebhookVehicles webhookId={webhook.id} clientId={clientId} />
      <Footer
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        isValid={isValid}
        onCancel={() => onCancel(isDirty)}
      />
    </form>
  );
};

const Footer = ({
  isDirty,
  isValid,
  isSubmitting,
  onCancel,
}: {
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
}) => {
  return (
    <div className="flex w-full gap-4">
      <Button
        type="button"
        className="primary-outline flex-1"
        onClick={onCancel}
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
  );
};
