import { Webhook, WebhookFormInput } from '@/types/webhook';

export const extractCELFromWebhook = (webhook: Webhook): WebhookFormInput['cel'] => {
  const { data, trigger } = webhook;

  const operatorRegex = /([=!><]=|[><])/;
  const parts = trigger.split(operatorRegex).map((part) => part.trim());
  const operator = parts[1] ?? '';
  const value = parts[2] ?? '';

  return {
    conditions: [{ field: data, operator, value }],
    operator: 'AND',
  };
};
