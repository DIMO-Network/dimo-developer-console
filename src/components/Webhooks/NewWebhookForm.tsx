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
  onExit,
}: {
  onComplete: () => void;
  getToken: () => string;
  onExit: () => void;
}) => {
  const {
    onPrevious,
    onNext,
    isFirstStep,
    isLastStep,
    shouldSubmit,
    onSubmit,
    canGoToPrevious,
  } = useWebhookCreateFormContext();
  const { setNotification } = useContext(NotificationContext);

  const methods = useForm<WebhookFormInput>({
    mode: 'onChange',
    defaultValues: {
      coolDownPeriod: 0,
      cel: { operator: 'AND', conditions: [{ field: '', value: '', operator: '' }] },
      subscribe: {
        allVehicles: true,
      },
    },
  });

  const wrappedOnSubmit = methods.handleSubmit(async (data: WebhookFormInput) => {
    try {
      const response = await onSubmit(data, getToken());
      if (response?.message) {
        setNotification(response.message, '', 'success');
      }
      if (isLastStep) {
        return onComplete();
      }
      onNext();
    } catch (err) {
      captureException(err);
      let msg = 'Something went wrong completing the operation';
      if (err instanceof Error) {
        msg = err.message || msg;
      }
      setNotification(msg, '', 'error');
    }
  });

  return (
    <FormProvider {...methods}>
      <form className={'flex flex-1 flex-col gap-6'}>
        <FormStepComponent />
        <Footer
          previousDisabled={!canGoToPrevious}
          onPrevious={isFirstStep ? onExit : onPrevious}
          onNext={onNext}
          onSubmit={wrappedOnSubmit}
          shouldSubmit={shouldSubmit}
          isValid={methods.formState.isValid}
          isSubmitting={methods.formState.isSubmitting}
          prevButtonText={isFirstStep ? 'Cancel' : 'Previous'}
          nextButtonText={isLastStep ? 'Finish' : 'Next'}
        />
      </form>
    </FormProvider>
  );
};
