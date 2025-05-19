import { getDevJwt } from '@/utils/devJwt';
import { fetchWebhookById } from '@/services/webhook';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/hoc/QueryProvider';

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

const getQueryKey = (params: FetchWebhookVehiclesByIdParams) => [
  'webhook-vehicles',
  params,
];
export const invalidateQuery = (params: FetchWebhookVehiclesByIdParams) => {
  return queryClient.invalidateQueries({
    queryKey: getQueryKey(params),
    refetchType: 'all',
  });
};

export const useWebhookVehiclesById = (params: FetchWebhookVehiclesByIdParams) => {
  return useQuery({
    queryKey: getQueryKey(params),
    queryFn: () => handleFetchWebhookVehiclesById(params),
  });
};
