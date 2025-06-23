import { Webhook } from '@/types/webhook';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';

export const useHasSubscribedVehicles = (webhook: Webhook, clientId: string) => {
  const { data: subscribedVehicles } = useWebhookVehiclesById({
    webhookId: webhook.id,
    clientId,
  });
  return subscribedVehicles ? subscribedVehicles.length : true;
};
