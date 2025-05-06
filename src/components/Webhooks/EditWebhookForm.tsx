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
import { Button } from '@/components/Button';

type EditWebhookFormProps = {
  defaultValues: WebhookFormInput;
  onSubmit: (data: WebhookFormInput) => void;
};

export const EditWebhookForm: React.FC<EditWebhookFormProps> = ({
  defaultValues,
  onSubmit,
}) => {
  const methods = useForm<WebhookFormInput>({ defaultValues });
  const {
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <WebhookDescriptionField />
        <WebhookTargetUriField />
        <WebhookServiceField />
        <CELBuilder />
        <WebhookIntervalField />
        <div className="flex w-full gap-4">
          <Button type="button" className="primary-outline flex-1" disabled={!isDirty}>
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
    </FormProvider>
  );
};
