import React, { createContext, useContext, useState } from 'react';
import { EditWebhookFormState } from '@/types/webhook';
import { useRouter } from 'next/navigation';

type EditWebhookContextProps = {
  formState: EditWebhookFormState;
  setFormState: (state: EditWebhookFormState) => void;
  onCancel: (isDirty: boolean) => void;
  isDiscardingChanges: boolean;
  setIsDiscardingChanges: (isDiscardingChanges: boolean) => void;
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

  return (
    <EditWebhookContext.Provider
      value={{
        formState,
        setFormState,
        onCancel,
        isDiscardingChanges,
        setIsDiscardingChanges,
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
