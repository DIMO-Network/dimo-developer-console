import { useWebhooks } from '@/hooks/queries/useWebhooks';

export const useWebhookById = ({
  webhookId,
  clientId,
}: {
  webhookId: string;
  clientId: string;
}) => {
  const { data: webhooks, ...rest } = useWebhooks(clientId, {
    enabled: !!clientId && !!webhookId,
  });

  const webhook = webhooks?.find((w) => w.id.trim() === webhookId);

  return { data: webhook, ...rest };
};
