'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/components/FormStepTracker';

import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';

const STEPS = [
  WebhookFormStepName.CONFIGURE,
  WebhookFormStepName.DELIVERY,
  WebhookFormStepName.SPECIFY_VEHICLES,
];

export const View = () => {
  const [formStep, setFormStep] = useState(0);
  const router = useRouter();
  const getStep = (stepIndex: number) => {
    return STEPS[stepIndex];
  };

  const onSubmit = () => {
    console.log('onSubmit was called');
  };
  const onNext = () => {
    if (formStep === STEPS.length) {
      console.log('onSubmit should be called, not onNext');
      return;
    }
    setFormStep((prev) => prev + 1);
  };
  const onPrevious = () => {
    if (formStep === 0) {
      return router.replace('/webhooks');
    }
    setFormStep((prev) => prev - 1);
  };
  return (
    <div className={'flex flex-1 flex-row'}>
      <div className={'flex flex-col flex-1'}>
        <NewWebhookForm
          currentStep={getStep(formStep)}
          steps={STEPS}
          onSubmit={onSubmit}
          onNext={onNext}
          onPrevious={onPrevious}
        />
      </div>
      <RightPanel>
        <FormStepTracker currentStep={getStep(formStep)} steps={STEPS} />
      </RightPanel>
    </div>
  );
};
