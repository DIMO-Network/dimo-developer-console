import { Label } from '@/components/Label';
import React, { FC } from 'react';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';
import { BubbleLoader } from '@/components/BubbleLoader';
import { EditIcon } from '@/components/Icons';

interface Props {
  clientId: string;
  webhookId: string;
  goToSubscribedVehicles: () => void;
}
export const SubscribedVehicles: FC<Props> = ({
  clientId,
  webhookId,
  goToSubscribedVehicles,
}) => {
  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Subscribed vehicles</Label>
      <div className={'h-14 bg-cta-default flex items-center px-4 rounded-lg'}>
        <SubscribedVehiclesBody
          clientId={clientId}
          webhookId={webhookId}
          goToSubscribedVehicles={goToSubscribedVehicles}
        />
      </div>
    </div>
  );
};

const SubscribedVehiclesBody: FC<Props> = ({
  clientId,
  webhookId,
  goToSubscribedVehicles,
}) => {
  const {
    data: subscribedVehicles,
    isLoading: isLoadingSubscribedVehicles,
    error,
  } = useWebhookVehiclesById({
    clientId,
    webhookId: webhookId,
  });
  if (isLoadingSubscribedVehicles) {
    return <BubbleLoader isLoading isSmall />;
  }
  if (error) {
    return <p>Error fetching subscribed vehicles</p>;
  }
  return (
    <div className={'flex flex-1 justify-between'}>
      <p className={'text-sm'}>{subscribedVehicles?.length ?? 0} Vehicles</p>
      <button onClick={goToSubscribedVehicles} type={'button'}>
        <EditIcon />
      </button>
    </div>
  );
};
