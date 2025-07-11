'use server';

import { Webhook, WebhookCreateInput, WebhookEditableFields } from '@/types/webhook';
import axios from 'axios';
import { extractAxiosMessage } from '@/utils/api';
import { captureException } from '@sentry/nextjs';

const getWebhooksApiClient = (token?: string) => {
  let authHeader = undefined;
  if (token) {
    authHeader = `Bearer ${token}`;
  }
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_EVENTS_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader,
    },
  });
};

export const fetchWebhooks = async ({ token }: { token: string }): Promise<Webhook[]> => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.get<Webhook[]>('/v1/webhooks');
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error fetching webhooks'));
  }
};

export const fetchWebhookById = async ({
  webhookId,
  token,
}: {
  webhookId: string;
  token: string;
}): Promise<string[]> => {
  try {
    const client = getWebhooksApiClient(token);
    const response = await client.get<string[]>(`/v1/webhooks/${webhookId}`);
    return response.data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error fetching webhook'));
  }
};

export const createWebhook = async (
  webhook: WebhookCreateInput,
  token: string,
): Promise<Webhook> => {
  try {
    const client = getWebhooksApiClient(token);
    const response = await client.post<Webhook>('/v1/webhooks', webhook);
    return response.data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error creating webhook'));
  }
};

export const updateWebhook = async (
  id: string,
  webhook: WebhookEditableFields,
  token: string,
): Promise<Webhook> => {
  try {
    const { data } = await getWebhooksApiClient(token).put(`/v1/webhooks/${id}`, webhook);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error updating webhook'));
  }
};

export const deleteWebhook = async ({
  webhookId,
  token,
}: {
  webhookId: string;
  token: string;
}): Promise<void> => {
  try {
    const client = getWebhooksApiClient(token);
    await client.delete(`/v1/webhooks/${webhookId}`);
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error deleting webhook'));
  }
};

export const subscribeAllVehicles = async (webhookId: string, token: string) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(`/v1/webhooks/${webhookId}/subscribe/all`);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing all'));
  }
};

export const unsubscribeAllVehicles = async ({
  webhookId,
  token,
}: {
  webhookId: string;
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.delete(`/v1/webhooks/${webhookId}/unsubscribe/all`);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing vehicle'));
  }
};

export const subscribeByCsv = async ({
  webhookId,
  token,
  formData,
}: {
  webhookId: string;
  token: string;
  formData: FormData;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(
      `/v1/webhooks/${webhookId}/subscribe/csv`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing by CSV'));
  }
};

export const unsubscribeByCsv = async ({
  webhookId,
  token,
  formData,
}: {
  webhookId: string;
  token: string;
  formData: FormData;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.delete(`/v1/webhooks/${webhookId}/unsubscribe/csv`, {
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error unsubscribing by CSV'));
  }
};
