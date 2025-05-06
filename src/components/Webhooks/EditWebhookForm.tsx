import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import {
  WebhookDescriptionField,
  WebhookServiceField,
  WebhookIntervalField,
  WebhookTargetUriField,
  CELBuilder,
} from '@/components/Webhooks/fields';

type EditWebhookFormProps = {
  defaultValues: WebhookFormInput;
  onSubmit: (data: WebhookFormInput) => void;
};

export const EditWebhookForm: React.FC<EditWebhookFormProps> = ({
  defaultValues,
  onSubmit,
}) => {
  console.log(defaultValues.cel);
  const methods = useForm<WebhookFormInput>({ defaultValues });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <WebhookDescriptionField />
        <WebhookTargetUriField />
        <WebhookServiceField />
        <CELBuilder />
        <WebhookIntervalField />
        <button type="submit" className="primary">
          Save Changes
        </button>
      </form>
    </FormProvider>
  );
};
