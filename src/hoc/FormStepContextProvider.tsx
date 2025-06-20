import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  FormStep,
  Webhook,
  WebhookFormInput,
  WebhookFormStepName,
} from '@/types/webhook';
import { formatWebhookFormData } from '@/utils/webhook';
import { createWebhook, subscribeAllVehicles, subscribeByCsv } from '@/services/webhook';

const steps = [
  new FormStep(WebhookFormStepName.CONFIGURE, 'Configure'),
  new FormStep(WebhookFormStepName.DELIVERY, 'Specify delivery'),
  new FormStep(WebhookFormStepName.SPECIFY_VEHICLES, 'Specify vehicles'),
];

interface ContextProps {
  steps: FormStep[];
  stepIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  getCurrentStep: () => FormStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  createdWebhook: Webhook | undefined;
  updateCreatedWebhook: (webhook: Webhook) => void;
  shouldSubmit: boolean;
  onSubmit: (data: WebhookFormInput, token: string) => Promise<{ message: string }>;
}

export const FormStepContext = createContext<ContextProps | undefined>(undefined);

export const FormStepContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [createdWebhook, setCreatedWebhook] = useState<Webhook>();
  const isLastStep = stepIndex === steps.length - 1;
  const isFirstStep = stepIndex === 0;

  const onNext = () => {
    if (isLastStep) {
      throw new Error('Cannot increment stepIndex');
    }
    setStepIndex((curStepIndex) => curStepIndex + 1);
  };

  const onPrevious = () => {
    if (stepIndex === 0) {
      throw new Error('Cannot decrement stepIndex');
    }
    setStepIndex((curStepIndex) => curStepIndex - 1);
  };

  const getCurrentStep = useCallback(() => {
    return steps[stepIndex];
  }, [stepIndex]);

  const updateCreatedWebhook = (webhook: Webhook) => setCreatedWebhook(webhook);

  const handleCreateWebhook = async (webhookData: WebhookFormInput, token: string) => {
    const formattedData = formatWebhookFormData(webhookData);
    const newWebhook = await createWebhook(formattedData, token);
    setCreatedWebhook(newWebhook);
    return { message: 'Webhook created successfully' };
  };

  const handleSubscribeVehicles = async (
    webhookData: WebhookFormInput,
    token: string,
  ) => {
    if (!createdWebhook) {
      throw new Error('Expected to have a webhook');
    }
    if (webhookData.subscribe?.allVehicles) {
      const response = await subscribeAllVehicles(createdWebhook.id, token);
      return { message: response.message };
    } else if (webhookData.subscribe?.file) {
      const formData = new FormData();
      formData.append('file', webhookData.subscribe.file);
      const response = await subscribeByCsv({
        webhookId: createdWebhook.id,
        token,
        formData,
      });
      return { message: response.message };
    } else {
      throw new Error('Unhandled webhook subscribe type');
    }
  };

  const shouldSubmit = useMemo(() => {
    const stepName = getCurrentStep().getName();
    return (
      stepName === WebhookFormStepName.DELIVERY ||
      stepName === WebhookFormStepName.SPECIFY_VEHICLES
    );
  }, [getCurrentStep]);

  const onSubmit = (data: WebhookFormInput, token: string) => {
    const stepName = getCurrentStep().getName();
    if (stepName === WebhookFormStepName.DELIVERY) {
      return handleCreateWebhook(data, token);
    } else if (stepName === WebhookFormStepName.SPECIFY_VEHICLES) {
      return handleSubscribeVehicles(data, token);
    } else {
      throw new Error('Step cannot call onSubmit');
    }
  };

  return (
    <FormStepContext.Provider
      value={{
        steps,
        onNext,
        onPrevious,
        getCurrentStep,
        stepIndex,
        isFirstStep,
        isLastStep,
        createdWebhook,
        updateCreatedWebhook,
        shouldSubmit,
        onSubmit,
      }}
    >
      {children}
    </FormStepContext.Provider>
  );
};

export const useWebhookCreateFormContext = () => {
  const context = useContext(FormStepContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormStepContextProvider');
  }
  return context;
};
