'use server';

import {
  Condition,
  Webhook,
  WebhookCreateInput,
  WebhookEditableFields,
} from '@/types/webhook';
import axios from 'axios';
import { extractAxiosMessage } from '@/utils/api';
import { conditionsConfig } from '@/utils/webhook';

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

export const formatAndGenerateCEL = async (cel: { conditions: Condition[] }) => {
  if (cel.conditions.length !== 1) {
    throw new Error('Must have exactly one CEL condition');
  }
  const hasInvalidCondition = cel.conditions.some(
    (cond) => !cond.field || !cond.operator || !cond.value,
  );
  if (hasInvalidCondition) {
    throw new Error('Please complete all condition fields before saving.');
  }
  const condition = cel.conditions[0];
  const conditionConfig = conditionsConfig.find((it) => it.field === condition.field);
  if (!conditionConfig) {
    throw new Error('Could not find condition config');
  }
  const valueType =
    conditionConfig.inputType === 'number' ? 'valueNumber' : 'valueString';
  return {
    data: cel.conditions[0].field,
    trigger: `${valueType} ${condition.operator} ${condition.value}`,
  };
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

export const subscribeAllVehicles = async (webhookId: string, token: string) => {
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
    throw new Error(extractAxiosMessage(err, 'Unknown error unsubscribing by CSV'));
  }
};
