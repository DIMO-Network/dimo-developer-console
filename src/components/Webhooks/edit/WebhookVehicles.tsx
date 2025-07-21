import { Label } from '@/components/Label';
import React, { FC, useContext } from 'react';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';
import { BubbleLoader } from '@/components/BubbleLoader';
import { EditIcon } from '@/components/Icons';
import { useFormContext } from 'react-hook-form';
import { EditWebhookFormState, WebhookFormInput } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';

interface Props {
  clientId: string;
  webhookId: string;
}

export const WebhookVehicles: FC<Props> = ({ clientId, webhookId }) => {
  const {
    formState: { isDirty },
  } = useFormContext<WebhookFormInput>();
  const { setNotification } = useContext(NotificationContext);
  const { setFormState } = useEditWebhookContext();
  const { data, isLoading, error } = useWebhookVehiclesById({
    clientId,
    webhookId: webhookId,
  });

  const goToSubscribedVehicles = () => {
    if (isDirty) {
      return setNotification(
        'Please save or discard your changes before proceeding',
        '',
        'error',
      );
    }
    setFormState(EditWebhookFormState.SUBSCRIBE_VEHICLES);
  };

  const errorMsg = error ? 'Error fetching subscribed vehicles' : undefined;

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Subscribed vehicles</Label>
      <div className={'h-14 bg-cta-default flex items-center px-4 rounded-lg'}>
        <WebhookVehiclesNumber
          isLoading={isLoading}
          error={errorMsg}
          numVehicles={data?.length ?? 0}
          onEdit={goToSubscribedVehicles}
        />
      </div>
    </div>
  );
};

const WebhookVehiclesNumber: FC<{
  isLoading: boolean;
  error?: string;
  numVehicles: number;
  onEdit: () => void;
}> = ({ isLoading, error, numVehicles, onEdit }) => {
  if (isLoading) {
    return <BubbleLoader isLoading isSmall />;
  }
  if (error) {
    return <p>{error}</p>;
  }
  return (
    <div className={'flex flex-1 justify-between'}>
      <p className={'text-sm'}>{numVehicles} Vehicles</p>
      <button onClick={onEdit} type={'button'}>
        <EditIcon />
      </button>
    </div>
  );
};
