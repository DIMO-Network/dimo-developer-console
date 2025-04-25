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
  const devJwt = getDevJwt(clientId);

  useEffect(() => {
    if (!devJwt) {
      router.replace('/webhooks');
    }
  }, [clientId, devJwt, router]);

  const getStep = (stepIndex: number) => {
    return STEPS[stepIndex];
  };

  const onSubmit = async (data: WebhookCreateInput) => {
    try {
      console.log('trying to create webhook', data);
      if (!devJwt) {
        return setNotification('No devJWT found', '', 'error');
      }
      await createWebhook(
        { ...data, status: 'Active', data: 'speed', trigger: 'valueNumber > 100' },
        devJwt,
      );
      setNotification('Webhook created successfully', '', 'success');
      router.replace('/webhooks');
    } catch (err: unknown) {
      let message = 'There was an error creating your webhook';
      if (err instanceof Error) {
        message = err.message ?? message;
      }
      setNotification(message, '', 'error');
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
