'use server';

import { Condition, Webhook, WebhookCreateInput } from '@/types/webhook';
import xior from 'xior';
import axios from 'axios';
import configuration from '@/config';
import { DIMO } from '@dimo-network/data-sdk';

const dimo = new DIMO(configuration.environment === 'production' ? 'Production' : 'Dev');

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

interface GetTokenParams {
  client_id: string;
  domain: string;
  private_key: string;
}

interface GetDeveloperJwtResponse {
  headers: { Authorization: `Bearer ${string}` };
}

export const getDeveloperJwt = async (
  tokenParams: GetTokenParams,
): Promise<GetDeveloperJwtResponse> => {
  return await dimo.auth.getDeveloperJwt({
    client_id: tokenParams.client_id,
    domain: tokenParams.domain,
    private_key: tokenParams.private_key,
  });
};

const getWebhooksApiClient = async (token: string) => {
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_EVENTS_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
};

export const fetchSignalNames = async (): Promise<string[]> => {
  const { data } = await webhookApiClient.get<string[]>('/webhooks/signals');
  return data;
};

export const fetchWebhooks = async ({ token }: { token: string }): Promise<Webhook[]> => {
  const client = await getWebhooksApiClient(token);
  const { data } = await client.get<Webhook[]>('/webhooks');
  return data;
};

export const createWebhook = async (
  webhook: WebhookCreateInput,
  token: string,
): Promise<Webhook> => {
  const payload = {
    service: webhook.service || 'Telemetry',
    trigger: webhook.trigger || 'Conditions Empty',
    setup: webhook.setup || 'Realtime',
    target_uri: webhook.target_uri || 'https://example.com/webhook',
    status: webhook.status || 'Active',
    description: webhook.description || 'Default Description',
    data: webhook.data,
  };
  const client = await getWebhooksApiClient(token);
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
    signalName: webhook.signalName,
    status: webhook.status,
    description: webhook.description,
  };
  const { data } = await webhookApiClient.put<Webhook>(`/webhooks/${id}`, payload);
  return data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await webhookApiClient.delete(`/webhooks/${id}`);
};

export const generateCEL = async (
  conditions: Condition[],
  logic: string,
): Promise<string> => {
  const { data } = await webhookApiClient.post<{ cel_expression: string }>('/build-cel', {
    conditions,
    logic,
  });
  return data.cel_expression;
};
