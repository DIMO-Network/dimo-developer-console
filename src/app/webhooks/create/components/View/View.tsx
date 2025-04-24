'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { useContext, useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/components/FormStepTracker';

import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import { createWebhook } from '@/services/webhook';
import { WebhookCreateInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';

const STEPS = [
  WebhookFormStepName.CONFIGURE,
  WebhookFormStepName.DELIVERY,
  WebhookFormStepName.SPECIFY_VEHICLES,
];

export const View = () => {
  const [formStep, setFormStep] = useState(0);
  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);

  const getStep = (stepIndex: number) => {
    return STEPS[stepIndex];
  };

  const onSubmit = async (data: WebhookCreateInput) => {
    try {
      await createWebhook({
        ...data,
        data: 'speed',
        trigger: 'valueNumber > 10',
        status: 'Active',
      });
      setNotification('Webhook created successfully', '', 'success');
    } catch (err) {
      console.error('received error trying to create the webhook', err);
      setNotification('Error creating webhook', '', 'error');
    }
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
