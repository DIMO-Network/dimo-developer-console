import { fetchWebhooks } from '@/services/webhook';
import { useQuery } from '@tanstack/react-query';
import { getDevJwt } from '@/utils/devJwt';
import { queryClient } from '@/hoc/QueryProvider';

const handleFetchWebhooks = async (clientId: string) => {
  const token = getDevJwt(clientId);
  if (!token) throw new Error(`No devJWT found for client ${clientId}`);
  return await fetchWebhooks({ token });
};

const getQueryKey = (clientId: string) => ['webhooks', clientId];

export const invalidateQuery = (clientId: string) => {
  return queryClient.invalidateQueries({
    queryKey: getQueryKey(clientId),
    refetchType: 'all',
  });
};

export const useWebhooks = (clientId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: getQueryKey(clientId),
    queryFn: () => handleFetchWebhooks(clientId),
    ...options,
  });
};
