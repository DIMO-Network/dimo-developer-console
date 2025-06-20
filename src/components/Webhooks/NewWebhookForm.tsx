'use client';

import { FormProvider, useForm } from 'react-hook-form';
import React, { useContext } from 'react';
import { WebhookFormInput, WebhookFormStepName } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { captureException } from '@sentry/nextjs';
import { WebhookSubscribeVehiclesStep } from '@/components/Webhooks/create/SubscribeVehicles';
import { WebhookDeliveryStep } from '@/components/Webhooks/create/Delivery';
import { WebhookConfigStep } from '@/components/Webhooks/create/Configuration';
import Footer from './Footer';
import { useWebhookCreateFormContext } from '@/hoc';

const FormStepComponent = () => {
  const { getCurrentStep } = useWebhookCreateFormContext();
  const step = getCurrentStep();
  switch (step.getName()) {
    case WebhookFormStepName.SPECIFY_VEHICLES:
      return <WebhookSubscribeVehiclesStep />;
    case WebhookFormStepName.DELIVERY:
      return <WebhookDeliveryStep />;
    case WebhookFormStepName.CONFIGURE:
      return <WebhookConfigStep />;
    default:
      return null;
  }
};

export const NewWebhookForm = ({
  onComplete,
  getToken,
}: {
  onComplete: () => void;
  getToken: () => string;
}) => {
  const { onPrevious, onNext, isFirstStep, isLastStep, shouldSubmit, onSubmit } =
    useWebhookCreateFormContext();
  const { setNotification } = useContext(NotificationContext);

  const methods = useForm<WebhookFormInput>({
    mode: 'onChange',
    defaultValues: {
      cel: { operator: 'AND', conditions: [{ field: '', value: '', operator: '' }] },
      subscribe: {
        allVehicles: true,
      },
    },
  });

  const wrappedOnSubmit = methods.handleSubmit(async (data: WebhookFormInput) => {
    try {
      const { message } = await onSubmit(data, getToken());
      setNotification(message, '', 'success');
      if (isLastStep) {
        return onComplete();
      }
      onNext();
    } catch (err) {
      captureException(err);
      setNotification('Something went wrong completing the operation', '', 'error');
    }
  });

  return (
    <FormProvider {...methods}>
      <form className={'flex flex-1 flex-col gap-6'}>
        <FormStepComponent />
        <Footer
          onPrevious={onPrevious}
          onNext={onNext}
          onSubmit={wrappedOnSubmit}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          shouldSubmit={shouldSubmit}
          isValid={methods.formState.isValid}
          isSubmitting={methods.formState.isSubmitting}
        />
      </form>
    </FormProvider>
  );
};
