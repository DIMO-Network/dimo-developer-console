'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/components/FormStepTracker';

import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';

export const View = () => {
  const [formStep, setFormStep] = useState(0);
  const getStep = (stepIndex: number) => {
    if (stepIndex === 0) return WebhookFormStepName.CONFIGURE;
    if (stepIndex === 1) return WebhookFormStepName.DELIVERY;
    if (stepIndex === 2) return WebhookFormStepName.SPECIFY_VEHICLES;
    throw new Error('Unhandled stepindex');
  };
  const onSubmit = () => {
    console.log('onSubmit was called');
  };
  const onNext = () => {
    setFormStep((prev) => prev + 1);
  };
  return (
    <div className={'flex flex-1 flex-row'}>
      <div className={'flex flex-col flex-1'}>
        <NewWebhookForm step={getStep(formStep)} onSubmit={onSubmit} onNext={onNext} />
      </div>
      <RightPanel>
        <FormStepTracker curStep={formStep} />
      </RightPanel>
    </div>
  );
};
