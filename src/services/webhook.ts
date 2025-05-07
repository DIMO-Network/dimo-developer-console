'use server';

import {
  Condition,
  Webhook,
  WebhookCreateInput,
  WebhookEditableFields,
} from '@/types/webhook';
import xior from 'xior';
import axios from 'axios';
import { extractAxiosMessage } from '@/utils/api';

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
    throw new Error(extractAxiosMessage(err, 'Unknown error deleting webhook'));
  }
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
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing all'));
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
    console.log(
      'ERROR TRYING TO SUBSCRIBE A VEHICLE',
      err,
      token,
      webhookId,
      vehicleTokenId,
    );
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing vehicle'));
  }
};

export const unsubscribeVehicle = async ({
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
    const { data } = await client.delete(
      `/v1/webhooks/${webhookId}/unsubscribe/${vehicleTokenId}`,
    );
    return data;
  } catch (err) {
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing vehicle'));
  }
};

export const subscribeVehicleIds = async (
  webhookId: string,
  tokenIds: string[],
  token: string,
) => {
  const results = await Promise.allSettled(
    tokenIds.map((tokenId) =>
      subscribeVehicle({ webhookId, vehicleTokenId: tokenId, token }),
    ),
  );
  const failures = results.filter((r) => r.status === 'rejected');
  return failures.length;
};

export const unsubscribeVehicleIds = async (
  webhookId: string,
  tokenIds: string[],
  token: string,
) => {
  const results = await Promise.allSettled(
    tokenIds.map((tokenId) =>
      unsubscribeVehicle({ webhookId, vehicleTokenId: tokenId, token }),
    ),
  );
  const failures = results.filter((r) => r.status === 'rejected');
  return failures.length;
};
