import { getDevJwt } from '@/utils/devJwt';
import { fetchWebhookById } from '@/services/webhook';
import { useQuery } from '@tanstack/react-query';

interface FetchWebhookVehiclesByIdParams {
  webhookId: string;
  clientId: string;
}

const handleFetchWebhookVehiclesById = async ({
  webhookId,
  clientId,
}: FetchWebhookVehiclesByIdParams) => {
  const token = getDevJwt(clientId);
  if (!token) throw new Error(`No devJWT found for client ${clientId}`);
  return await fetchWebhookById({ webhookId, token });
};

export const useWebhookVehiclesById = (params: FetchWebhookVehiclesByIdParams) => {
  return useQuery({
    queryKey: ['webhook-vehicles', params],
    queryFn: () => handleFetchWebhookVehiclesById(params),
  });
};
