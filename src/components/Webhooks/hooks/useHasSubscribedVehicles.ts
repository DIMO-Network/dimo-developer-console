import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';

export const useHasSubscribedVehicles = (webhookId: string, clientId: string) => {
  const { data: subscribedVehicles } = useWebhookVehiclesById({
    webhookId,
    clientId,
  });
  return subscribedVehicles ? subscribedVehicles.length : true;
};
