import React, { createContext, useContext, useState } from 'react';
import { EditWebhookFormState, Webhook, WebhookFormInput } from '@/types/webhook';
import { useRouter } from 'next/navigation';
import { formatAndGenerateCEL } from '@/utils/webhook';
import { updateWebhook } from '@/services/webhook';

type EditWebhookContextProps = {
  formState: EditWebhookFormState;
  setFormState: (state: EditWebhookFormState) => void;
  onCancel: (isDirty: boolean) => void;
  isDiscardingChanges: boolean;
  setIsDiscardingChanges: (isDiscardingChanges: boolean) => void;
  submitForm: (
    formData: WebhookFormInput,
    webhook: Webhook,
    token: string,
  ) => Promise<void>;
};

const EditWebhookContext = createContext<EditWebhookContextProps | undefined>(undefined);

export const EditWebhookContextProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [isDiscardingChanges, setIsDiscardingChanges] = useState(false);
  const [formState, setFormState] = useState<EditWebhookFormState>(
    EditWebhookFormState.EDIT_FORM,
  );
  const router = useRouter();

  const onCancel = (isDirty: boolean) => {
    if (isDirty) {
      return setIsDiscardingChanges(true);
    }
    goBack();
  };

  const goBack = () => {
    router.replace('/webhooks');
  };

  const submitFormLogic = async (
    formData: WebhookFormInput,
    webhook: Webhook,
    token: string,
  ) => {
    const { metricName, condition } = formatAndGenerateCEL(formData.cel);
    await updateWebhook(webhook.id, { ...formData, metricName, condition }, token);
  };

  return (
    <EditWebhookContext.Provider
      value={{
        formState,
        setFormState,
        onCancel,
        isDiscardingChanges,
        setIsDiscardingChanges,
        submitForm: submitFormLogic,
      }}
    >
      {children}
    </EditWebhookContext.Provider>
  );
};

export const useEditWebhookContext = () => {
  const context = useContext(EditWebhookContext);
  if (!context) {
    throw new Error('useEditWebhookContext must be used within a EditWebhookContext');
  }
  return context;
};
