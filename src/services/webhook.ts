'use server';
import { Webhook, Condition } from '@/types/webhook';
import xior from 'xior';
import config from '@/config';

const getAuthToken = () => {
    return localStorage.getItem('developer_jwt') || '';
};

const webhookApiClient = xior.create({
    baseURL: config.API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
    },
});

export const fetchSignalNames = async (): Promise<string[]> => {
    const { data } = await webhookApiClient.get<string[]>('/webhooks/signals');
    return data;
};

export const fetchWebhooks = async (): Promise<Webhook[]> => {
    const { data } = await webhookApiClient.get<Webhook[]>('/webhooks');
    return data;
};

export const createWebhook = async (webhook: Partial<Webhook>): Promise<Webhook> => {
    const payload = {
        service: webhook.service || 'Telemetry',
        trigger: webhook.trigger || 'Conditions Empty',
        setup: webhook.setup || 'Realtime',
        target_uri: webhook.target_uri || 'https://example.com/webhook',
        signalName: webhook.signalName, // New dedicated field.
        developer_license_address: webhook.developer_license_address || '1234567890abcdef',
        status: webhook.status || 'Active',
        description: webhook.description || 'Default Description',
    };
    const { data } = await webhookApiClient.post<Webhook>('/webhooks', payload);
    return data;
};

export const updateWebhook = async (id: string, webhook: Partial<Webhook>): Promise<Webhook> => {
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

export const generateCEL = async (conditions: Condition[], logic: string): Promise<string> => {
    const { data } = await webhookApiClient.post<{ cel_expression: string }>('/build-cel', {
        conditions,
        logic,
    });
    return data.cel_expression;
};
