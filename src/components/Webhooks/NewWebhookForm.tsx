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
    getCurrentStep,
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
    const currentStep = getCurrentStep();
    const stepName = currentStep.getName();

    console.log('==========================================');
    console.log('📝 WEBHOOK FORM SUBMISSION DEBUG');
    console.log('==========================================');
    console.log('Current Step:', stepName);
    console.log('Should Submit:', shouldSubmit);
    console.log('Is Last Step:', isLastStep);
    console.log('Form Data Preview:', {
      targetURL: data.targetURL,
      verificationToken: data.verificationToken ? 'PROVIDED' : 'MISSING',
      service: data.service,
      conditions: data.cel?.conditions?.length || 0,
    });

    try {
      console.log('🔐 Attempting to get token...');
      const token = getToken();
      console.log('✅ Token retrieved for submission:', !!token);
      console.log('Token preview:', token.substring(0, 30) + '...');

      console.log('📡 Calling onSubmit with data and token...');
      const response = await onSubmit(data, token);

      console.log('✅ onSubmit completed successfully');
      console.log('Response:', response);

      if (response?.message) {
        console.log('📢 Setting success notification:', response.message);
        setNotification(response.message, '', 'success');
      }
      if (isLastStep) {
        console.log('🏁 Final step completed - calling onComplete');
        return onComplete();
      }
      console.log('➡️ Moving to next step');
      onNext();
    } catch (err) {
      console.error('==========================================');
      console.error('❌ WEBHOOK FORM SUBMISSION ERROR');
      console.error('==========================================');
      console.error('Error object:', err);
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);

      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }

      // Check if it's a network/API error
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as unknown;
        console.error(
          'HTTP Status:',
          (axiosError as { response?: { status?: number } }).response?.status,
        );
        console.error(
          'Response data:',
          (axiosError as { response?: { data?: unknown } }).response?.data,
        );
        console.error(
          'Response headers:',
          (axiosError as { response?: { headers?: unknown } }).response?.headers,
        );
      }

      console.error('==========================================');

      captureException(err);
      let msg = 'Something went wrong completing the operation';
      if (err instanceof Error) {
        msg = err.message || msg;
      }
      console.log('📢 Setting error notification:', msg);
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
