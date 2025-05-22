'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { use, useContext, useEffect, useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/[clientId]/components/FormStepTracker';
import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import {
  createWebhook,
  formatAndGenerateCEL,
  subscribeAllVehicles,
  subscribeByCsv,
} from '@/services/webhook';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { getDevJwt } from '@/utils/devJwt';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';

const STEPS = [
  WebhookFormStepName.CONFIGURE,
  WebhookFormStepName.DELIVERY,
  WebhookFormStepName.SPECIFY_VEHICLES,
];

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const [createdWebhook, setCreatedWebhook] = useState<Webhook>();
  const [formStep, setFormStep] = useState<WebhookFormStepName>(STEPS[0]);

  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);
  const devJwt = getDevJwt(clientId);

  useEffect(() => {
    if (!devJwt) {
      router.replace('/webhooks');
    }
  }, [clientId, devJwt, router]);

  const createWebhookFromInput = async (
    formData: WebhookFormInput,
    authToken: string,
  ) => {
    const { data, trigger } = await formatAndGenerateCEL(formData.cel);
    return await createWebhook(
      { ...formData, status: 'Active', data, trigger },
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
      setNotification('Webhook created successfully', '', 'success', 3000);
      onNext();
    } catch (err: unknown) {
      let message = 'There was an error creating your webhook';
      if (err instanceof Error) {
        message = err.message ?? message;
      }
      captureException(err);
      setNotification(message, '', 'error');
    }
  };

  const onSubscribe = async (data: WebhookFormInput) => {
    try {
      if (!createdWebhook) {
        return setNotification('No webhook was found', '', 'error');
      }
      if (!devJwt) {
        return setNotification('No devJWT found', '', 'error');
      }
      if (data.subscribe?.allVehicles) {
        const response = await subscribeAllVehicles(createdWebhook.id, devJwt);
        setNotification(
          response?.message ?? 'Successfully subscribed all vehicles',
          '',
          'success',
        );
        onFinish();
      } else if (data.subscribe?.file) {
        const formData = new FormData();
        formData.append('file', data.subscribe.file);
        const response = await subscribeByCsv({
          webhookId: createdWebhook.id,
          token: devJwt,
          formData,
        });
        setNotification(
          response.message ?? 'Successfully subscribed vehicles',
          '',
          'success',
        );
      }
      onFinish();
    } catch (err) {
      captureException(err);
      setNotification('Failed to subscribe all vehicles', '', 'error');
    }
  };

  const onFinish = () => {
    invalidateQuery(clientId);
    router.replace('/webhooks');
  };

  const onNext = () => {
    const curStepIndex = STEPS.indexOf(formStep);
    if (curStepIndex > -1 && curStepIndex < STEPS.length - 1) {
      const nextStep = STEPS[curStepIndex + 1];
      setFormStep(nextStep);
    }
  };

  const onBack = () => {
    router.replace('/webhooks');
  };

  const onPrevious = () => {
    const curStepIndex = STEPS.indexOf(formStep);
    if (curStepIndex === 0) {
      return onBack();
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
