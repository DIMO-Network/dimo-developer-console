'use server';

import { Condition, Webhook, WebhookCreateInput } from '@/types/webhook';
import xior from 'xior';
import axios from 'axios';

const getAuthToken = () => {
  return '';
  // return localStorage.getItem('developer_jwt') || '';
};

const webhookApiClient = xior.create({
  baseURL: process.env.NEXT_PUBLIC_EVENTS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
  },
});

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

export const fetchSignalNames = async (): Promise<string[]> => {
  const { data } = await webhookApiClient.get<string[]>('/webhooks/signals');
  return data;
};

export const fetchWebhooks = async ({ token }: { token: string }): Promise<Webhook[]> => {
  const client = getWebhooksApiClient(token);
  const { data } = await client.get<Webhook[]>('/v1/webhooks');
  return data;
};

export const fetchWebhookById = async ({
  id,
  token,
}: {
  id: string;
  token: string;
}): Promise<string[]> => {
  try {
    const client = getWebhooksApiClient(token);
    const response = await client.get<string[]>(`/v1/webhooks/${id}`);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Unknown error fetching webhook',
      );
    }
    throw new Error('Unexpected error creating webhook');
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
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Unknown error creating webhook',
      );
    }
    throw new Error('Unexpected error creating webhook');
  }
};

export const updateWebhook = async (
  id: string,
  webhook: Partial<Webhook>,
  token: string,
): Promise<Webhook> => {
  try {
    const { data } = await getWebhooksApiClient(token).put(`/v1/webhooks/${id}`, webhook);
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Unknown error updating webhook',
      );
    }
    throw new Error('Unexpected error creating webhook');
  }
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await webhookApiClient.delete(`/webhooks/${id}`);
};

export const formatAndGenerateCEL = async (cel: {
  operator: string;
  conditions: Condition[];
}) => {
  if (cel.conditions.length !== 1) {
    throw new Error('Must have exactly one CEL condition');
  }
  const hasInvalidCondition = cel.conditions.some(
    (cond) => !cond.field || !cond.operator || !cond.value,
  );
  if (!cel.operator || hasInvalidCondition) {
    throw new Error('Please complete all condition fields before saving.');
  }
  return await generateCEL({
    conditions: cel.conditions,
    logic: cel.operator,
  });
};

export const generateCEL = async ({
  conditions,
  logic,
}: {
  conditions: Condition[];
  logic: string;
}): Promise<string> => {
  const client = getWebhooksApiClient();
  const { data } = await client.post<{ cel_expression: string }>('/build-cel', {
    conditions,
    logic,
  });
  return data.cel_expression;
};

export const subscribeAll = async (webhookId: string, token: string) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(`/v1/webhooks/${webhookId}/subscribe/all`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Unknown error subscribing all',
      );
    }
    throw new Error('Unexpected error creating webhook');
  }
};

export const subscribeVehicle = async ({
  webhookId,
  vehicleTokenId,
  token,
}: {
  webhookId: string;
  vehicleTokenId: string;
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(
      `/v1/webhooks/${webhookId}/subscribe/${vehicleTokenId}`,
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Unknown error subscribing vehicle',
      );
    }
    throw new Error('Unexpected error creating webhook');
  }
};
