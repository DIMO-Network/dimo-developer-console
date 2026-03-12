import { Webhook } from '@/types/webhook';

export const getWebhookEditUrl = (webhook: Webhook, clientId: string) => {
  return `/webhooks/edit/${clientId}/${webhook.id.trim()}`;
};
