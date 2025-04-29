'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { use, useContext, useEffect, useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/[clientId]/components/FormStepTracker';
import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import { createWebhook, formatAndGenerateCEL } from '@/services/webhook';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { getDevJwt } from '@/utils/devJwt';

const STEPS = [
  WebhookFormStepName.CONFIGURE,
  WebhookFormStepName.DELIVERY,
  WebhookFormStepName.SPECIFY_VEHICLES,
];

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const [createdWebhook, setCreatedWebhook] = useState<Webhook>();
  const { clientId } = use(params);
  const [formStep, setFormStep] = useState<WebhookFormStepName>(
    WebhookFormStepName.CONFIGURE,
  );
  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);
  const devJwt = getDevJwt(clientId);

  useEffect(() => {
    if (!devJwt) {
      router.replace('/webhooks');
    }
  }, [clientId, devJwt, router]);

  const createWebhookFromInput = async (data: WebhookFormInput, authToken: string) => {
    const trigger = await formatAndGenerateCEL(data.cel);

    // TODO - figure out how to generate data when multiple signals are included in the trigger
    return await createWebhook(
      { ...data, status: 'Active', data: 'speed', trigger: trigger },
      authToken,
    );
  };

  const handleSubmit = async (data: WebhookFormInput) => {
    try {
      if (!devJwt) {
        return setNotification('No devJWT found', '', 'error');
      }
      const newWebhook = await createWebhookFromInput(data, devJwt);
      setCreatedWebhook(newWebhook);
      setNotification('Webhook created successfully', '', 'success');
      onNext();
    } catch (err: unknown) {
      let message = 'There was an error creating your webhook';
      if (err instanceof Error) {
        message = err.message ?? message;
      }
      setNotification(message, '', 'error');
    }
  };

  const onSubscribe = () => {
    if (!createdWebhook) {
      return setNotification('No webhook was found', '', 'error');
    }
    // TODO - implement subscribe here

    setNotification('Successfully subscribed vehicles', '', 'success');
    router.replace('/webhooks');
  };

  const onNext = () => {
    const curStepIndex = STEPS.indexOf(formStep);
    if (curStepIndex > -1 && curStepIndex < STEPS.length - 1) {
      const nextStep = STEPS[curStepIndex + 1];
      setFormStep(nextStep);
    }
  };

  const onPrevious = () => {
    const curStepIndex = STEPS.indexOf(formStep);
    if (curStepIndex === 0) {
      return router.replace('/webhooks');
    }
    const prevStep = STEPS[curStepIndex - 1];
    setFormStep(prevStep);
  };

  return (
    <div className={'flex flex-1 flex-row'}>
      <div className={'flex flex-col flex-1'}>
        <NewWebhookForm
          currentStep={formStep}
          steps={STEPS}
          shouldSubmit={
            formStep === WebhookFormStepName.DELIVERY ||
            formStep === WebhookFormStepName.SPECIFY_VEHICLES
          }
          onSubmit={
            formStep === WebhookFormStepName.DELIVERY ? handleSubmit : onSubscribe
          }
          onNext={onNext}
          onPrevious={onPrevious}
        />
      </div>
      <RightPanel>
        <FormStepTracker currentStep={formStep} steps={STEPS} />
      </RightPanel>
    </div>
  );
};
