'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { use, useContext, useEffect, useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/[clientId]/components/FormStepTracker';

import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import { createWebhook } from '@/services/webhook';
import { WebhookCreateInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { getDevJwt } from '@/utils/localStorage';

const STEPS = [
  WebhookFormStepName.CONFIGURE,
  WebhookFormStepName.DELIVERY,
  WebhookFormStepName.SPECIFY_VEHICLES,
];

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const [formStep, setFormStep] = useState(0);
  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);

  useEffect(() => {
    const devJwt = getDevJwt(clientId);
    if (!devJwt) {
      router.replace('/webhooks');
    }
  }, [clientId, router]);
  const getStep = (stepIndex: number) => {
    return STEPS[stepIndex];
  };

  const onSubmit = async (data: WebhookCreateInput) => {
    try {
      console.log('trying to create webhook');
      await createWebhook(data);
      setNotification('Webhook created successfully', '', 'success');
    } catch (err) {
      console.log('error creating webhook', err);
      setNotification('There was an error creating your webhook', '', 'error');
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
