import { useWebhookVehiclesById } from '@/hooks/useWebhooks';
import { BubbleLoader } from '@/components/BubbleLoader';
import React from 'react';

export const VehicleCount = ({
  webhookId,
  clientId,
}: {
  webhookId: string;
  clientId: string;
}) => {
  const { data, isLoading } = useWebhookVehiclesById({ webhookId, clientId });

  if (isLoading) {
    return <BubbleLoader isLoading isSmall className={'!justify-start'} />;
  }

  return <>{data?.length ?? 0}</>;
};
