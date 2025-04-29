'use client';

import { FormProvider, useForm } from 'react-hook-form';
import Button from '@/components/Button/Button';
import React from 'react';
import { WebhookConfigStep } from '@/components/Webhooks/steps/Configuration';
import { WebhookDeliveryStep } from '@/components/Webhooks/steps/Delivery';
import { WebhookSpecifyVehiclesStep } from '@/components/Webhooks/steps/SpecifyVehicles';
import { WebhookFormInput } from '@/types/webhook';

export enum WebhookFormStepName {
  CONFIGURE = 'configure',
  DELIVERY = 'delivery',
  SPECIFY_VEHICLES = 'specify_vehicles',
}

export const NewWebhookForm = ({
  currentStep,
  onNext,
  onSubmit,
  onPrevious,
  steps,
  shouldSubmit,
}: {
  currentStep: WebhookFormStepName;
  steps: WebhookFormStepName[];
  onNext: () => void;
  onSubmit: (data: WebhookFormInput) => void;
  onPrevious: () => void;
  shouldSubmit: boolean;
}) => {
  const methods = useForm<WebhookFormInput>({
    defaultValues: {
      cel: { operator: 'AND', conditions: [{ field: '', value: '', operator: '' }] },
    },
  });
  const renderStep = () => {
    switch (currentStep) {
      case WebhookFormStepName.CONFIGURE:
        return <WebhookConfigStep />;
      case WebhookFormStepName.DELIVERY:
        return <WebhookDeliveryStep />;
      case WebhookFormStepName.SPECIFY_VEHICLES:
        return <WebhookSpecifyVehiclesStep />;
      default:
        return null;
    }
  };

  const getSecondaryButtonProps = () => {
    const isFirstStep = currentStep === steps[0];
    return {
      text: isFirstStep ? 'Cancel' : 'Previous',
    };
  };

  const { text: secondaryButtonText } = getSecondaryButtonProps();
  const isLastStep = currentStep === steps[steps.length - 1];
  return (
    <FormProvider {...methods}>
      <form className={'flex flex-1 flex-col gap-6'}>
        {renderStep()}
        <div className={'flex flex-col-reverse md:flex-row pt-6 flex-1 gap-4'}>
          <Button
            className={'flex-1 primary-outline'}
            onClick={onPrevious}
            type={'button'}
          >
            {secondaryButtonText}
          </Button>
          <Button
            className={'flex-1'}
            type={'button'}
            onClick={shouldSubmit ? methods.handleSubmit(onSubmit) : onNext}
            disabled={!methods.formState.isValid}
            loading={methods.formState.isSubmitting}
          >
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
