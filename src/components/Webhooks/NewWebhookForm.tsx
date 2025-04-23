'use client';

import { FormProvider, useForm } from 'react-hook-form';
import Button from '@/components/Button/Button';
import React from 'react';
import { WebhookConfigStep } from '@/components/Webhooks/steps/Configuration';
import { WebhookDeliveryStep } from '@/components/Webhooks/steps/Delivery';

export enum WebhookFormStepName {
  CONFIGURE = 'configure',
  DELIVERY = 'delivery',
  SPECIFY_VEHICLES = 'specify_vehicles',
}

export const NewWebhookForm = ({
  step,
  onNext,
  onSubmit,
}: {
  step: WebhookFormStepName;
  onNext: () => void;
  onSubmit: () => void;
}) => {
  const methods = useForm();
  const renderStep = () => {
    switch (step) {
      case WebhookFormStepName.CONFIGURE:
        return <WebhookConfigStep />;
      case WebhookFormStepName.DELIVERY:
        return <WebhookDeliveryStep />;
      default:
        return null;
    }
  };
  const buttonType = step === WebhookFormStepName.SPECIFY_VEHICLES ? 'submit' : 'button';
  const buttonOnClick =
    step === WebhookFormStepName.SPECIFY_VEHICLES ? undefined : onNext;
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className={'flex flex-1 flex-col gap-6'}
      >
        {renderStep()}
        <div className={'flex flex-col-reverse md:flex-row pt-6 flex-1 gap-4'}>
          <Button className={'flex-1 primary-outline'}>Cancel</Button>
          <Button
            className={'flex-1'}
            type={buttonType}
            disabled={!methods.formState.isValid}
            onClick={buttonOnClick}
          >
            Next
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
