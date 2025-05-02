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
  subscribeAll,
  subscribeVehicle,
} from '@/services/webhook';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { getDevJwt } from '@/utils/devJwt';
import { uniq } from 'lodash';

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

  const createWebhookFromInput = async (data: WebhookFormInput, authToken: string) => {
    const trigger = await formatAndGenerateCEL(data.cel);
    const signals = uniq(data.cel.conditions.map((it) => it.field));
    if (signals.length !== 1) {
      throw new Error('Only one signal is allowed in the webhook trigger');
    }
    return await createWebhook(
      { ...data, status: 'Active', data: signals[0], trigger: trigger },
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
      setNotification(message, '', 'error');
    }
  };

  const subscribeVehicleIds = async (
    webhookId: string,
    tokenIds: string[],
    token: string,
  ) => {
    const results = await Promise.allSettled(
      tokenIds.map((tokenId) =>
        subscribeVehicle({ webhookId, vehicleTokenId: tokenId, token }),
      ),
    );
    const failures = results.filter((r) => r.status === 'rejected');
    return failures.length;
  };

  const onSubscribe = async (data: WebhookFormInput) => {
    try {
      if (!createdWebhook) {
        return setNotification('No webhook was found', '', 'error');
      }
      if (!devJwt) {
        return setNotification('No devJWT found', '', 'error');
      }
      if (!(data.subscribe?.allVehicles || data.subscribe?.vehicleTokenIds?.length)) {
        return onFinish();
      }
      if (data.subscribe?.allVehicles) {
        await subscribeAll(createdWebhook.id, devJwt);
        setNotification('Successfully subscribed vehicles', '', 'success');
        onFinish();
      } else if (data.subscribe.vehicleTokenIds?.length) {
        const failures = await subscribeVehicleIds(
          createdWebhook.id,
          data.subscribe.vehicleTokenIds,
          devJwt,
        );

        if (failures > 0) {
          setNotification(`${failures} vehicle(s) failed to subscribe.`, '', 'error');
        } else {
          setNotification('Successfully subscribed vehicles', '', 'success');
        }
        onFinish();
      }
    } catch (err) {
      let message = 'There was an error subscribing these vehicles';
      if (err instanceof Error) {
        message = err.message ?? message;
      }
      setNotification(message, '', 'error');
    }
  };

  const onFinish = () => {
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
