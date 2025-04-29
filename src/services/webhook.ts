'use server';

import { Condition, Webhook, WebhookCreateInput } from '@/types/webhook';
import xior from 'xior';
import axios from 'axios';
import { conditionConfig } from '@/components/Webhooks/steps/Configuration/CELBuilder/constants';

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
  const { data } = await client.get<Webhook[]>('/webhooks');
  return data;
};

export const createWebhook = async (
  webhook: WebhookCreateInput,
  token: string,
): Promise<Webhook> => {
  const payload = {
    service: webhook.service,
    trigger: webhook.trigger,
    setup: webhook.setup,
    target_uri: webhook.target_uri,
    status: webhook.status,
    description: webhook.description,
    data: webhook.data,
  };
  const client = getWebhooksApiClient(token);
  try {
    const response = await client.post<Webhook>('/webhooks', payload);
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
): Promise<Webhook> => {
  const payload = {
    service: webhook.service,
    data: webhook.data,
    trigger: webhook.trigger,
    setup: webhook.setup,
    target_uri: webhook.target_uri,
    status: webhook.status,
    description: webhook.description,
  };
  const { data } = await webhookApiClient.put<Webhook>(`/webhooks/${id}`, payload);
  return data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await webhookApiClient.delete(`/webhooks/${id}`);
};

export const formatAndGenerateCEL = async (cel: {
  operator: string;
  conditions: Condition[];
}) => {
  const hasInvalidCondition = cel.conditions.some(
    (cond) => !cond.field || !cond.operator || !cond.value,
  );
  if (!cel.operator || hasInvalidCondition) {
    throw new Error('Please complete all condition fields before saving.');
  }
  const transformedConditions = cel.conditions.map((cond) => {
    const fieldConfig = conditionConfig.find((c) => c.field === cond.field);
    // TODO - figure out how to handle nested CELs
    if (fieldConfig?.multiFields?.length) {
      return {
        logic: 'OR',
        conditions: fieldConfig.multiFields.map((f) => ({
          field: f,
          operator: cond.operator,
          value: cond.value,
        })),
      };
    }
    return {
      field: cond.field,
      operator: cond.operator,
      value: cond.value,
    };
  });
  return await generateCEL({
    // @ts-expect-error backend needs fixing for this to work
    conditions: transformedConditions,
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
