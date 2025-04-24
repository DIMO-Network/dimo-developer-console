'use server';

import { Condition, Webhook, WebhookCreateInput } from '@/types/webhook';
import xior from 'xior';
import axios, { AxiosHeaders } from 'axios';
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

const webhooksApiClientAxios = async (devAuthHeaders: AxiosHeaders) => {
  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_EVENTS_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...devAuthHeaders,
    },
  });
};

export const fetchSignalNames = async (): Promise<string[]> => {
  const { data } = await webhookApiClient.get<string[]>('/webhooks/signals');
  return data;
};

export const fetchWebhooks = async (): Promise<Webhook[]> => {
  const { data } = await webhookApiClient.get<Webhook[]>('/webhooks');
  return data;
};

export const createWebhook = async (webhook: WebhookCreateInput): Promise<Webhook> => {
  const devJwt = (await dimo.auth.getDeveloperJwt({
    client_id: webhook.developerLicense.clientId,
    domain: webhook.developerLicense.domain,
    private_key: webhook.developerLicense.apiKey,
  })) as { headers: { Authorization: string } };
  const payload = {
    service: webhook.service || 'Telemetry',
    trigger: webhook.trigger || 'Conditions Empty',
    setup: webhook.setup || 'Realtime',
    target_uri: webhook.target_uri || 'https://example.com/webhook',
    // signalName: webhook.signalName, // new field
    // developer_license_address: webhook.developer_license_address || '1234567890abcdef',
    status: webhook.status || 'Active',
    description: webhook.description || 'Default Description',
  };
  const client = await webhooksApiClientAxios(devJwt.headers);
  const response = await client.post<Webhook>('/webhooks', payload);
  return response.data;
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
