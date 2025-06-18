'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { use, useContext, useEffect, useMemo, useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/[clientId]/components/FormStepTracker';
import {
  NewWebhookForm,
  WebhookFormStepName,
} from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import { createWebhook, subscribeAllVehicles, subscribeByCsv } from '@/services/webhook';
import { Webhook, WebhookFormInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { getDevJwt } from '@/utils/devJwt';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import { captureException } from '@sentry/nextjs';
import { formatWebhookFormData } from '@/utils/webhook';
import { WebhookConfigStep } from '@/components/Webhooks/create/Configuration';
import { WebhookDeliveryStep } from '@/components/Webhooks/create/Delivery';
import { WebhookSubscribeVehiclesStep } from '@/components/Webhooks/create/SubscribeVehicles';

export class FormStep {
  private stepName: WebhookFormStepName;
  private title: string;
  private Component: React.ElementType;

  constructor(
    stepName: WebhookFormStepName,
    title: string,
    Component: React.ElementType,
  ) {
    this.stepName = stepName;
    this.title = title;
    this.Component = Component;
  }

  getName() {
    return this.stepName;
  }

  getTitle() {
    return this.title;
  }

  getComponent() {
    return this.Component;
  }

  canSubmit() {
    return (
      this.stepName === WebhookFormStepName.DELIVERY ||
      this.stepName === WebhookFormStepName.SPECIFY_VEHICLES
    );
  }
}

const STEPS = [
  new FormStep(WebhookFormStepName.CONFIGURE, 'Configure', WebhookConfigStep),
  new FormStep(WebhookFormStepName.DELIVERY, 'Specify delivery', WebhookDeliveryStep),
  new FormStep(
    WebhookFormStepName.SPECIFY_VEHICLES,
    'Specify vehicles',
    WebhookSubscribeVehiclesStep,
  ),
];

const useFormSteps = () => {
  const [formStep, setFormStep] = useState<FormStep>(STEPS[0]);
  const router = useRouter();

  const shouldSubmit = useMemo(() => {
    return formStep.canSubmit();
  }, [formStep]);

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

  return {
    formStep,
    onNext,
    onPrevious,
    shouldSubmit,
  };
};

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const [createdWebhook, setCreatedWebhook] = useState<Webhook>();
  const { formStep, onNext, onPrevious, shouldSubmit } = useFormSteps();

  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);
  const devJwt = getDevJwt(clientId);

  useEffect(() => {
    if (!devJwt) {
      router.replace('/webhooks');
    }
  }, [clientId, devJwt, router]);

  const handleSubmit = async (data: WebhookFormInput) => {
    try {
      if (!devJwt) {
        return setNotification('No devJWT found', '', 'error');
      }
      const webhookCreateData = formatWebhookFormData(data);
      const webhook = await createWebhook(webhookCreateData, devJwt);
      setCreatedWebhook(webhook);
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

  return (
    <div className={'flex flex-1 flex-row'}>
      <div className={'flex flex-col flex-1'}>
        <NewWebhookForm
          currentStep={formStep}
          steps={STEPS}
          shouldSubmit={shouldSubmit}
          onSubmit={
            formStep.getName() === WebhookFormStepName.DELIVERY
              ? handleSubmit
              : onSubscribe
          }
          onNext={onNext}
          onPrevious={onPrevious}
        />
      </div>
      <RightPanel>
        <FormStepTracker steps={STEPS} />
      </RightPanel>
    </div>
  );
};
