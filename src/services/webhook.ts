import xior from 'xior';
import { Webhook, Condition } from '@/types/webhook';
import { API_BASE_URL } from '@/config/default';

interface GenerateCELResponse {
    cel_expression: string;
}

export const fetchSignalNames = async (): Promise<string[]> => {
    const response = await xior.get<string[]>(`${API_BASE_URL}/webhooks/signals`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });
    console.log("Fetch Signal Names Response:", response.data);
    return response.data;
};

export const fetchWebhooks = async (): Promise<Webhook[]> => {
    console.log('Fetching webhooks from:', `${API_BASE_URL}/webhooks`);
    const response = await xior.get<Webhook[]>(`${API_BASE_URL}/webhooks`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });
    console.log("Fetch Webhooks Response:", response.data);
    return response.data;
};

export const createWebhook = async (webhook: Partial<Webhook>): Promise<Webhook> => {
    const payload = {
        service: webhook.service || 'Telemetry',
        trigger: webhook.trigger || 'Conditions Empty',
        setup: webhook.setup || 'Realtime',
        target_uri: webhook.target_uri || 'https://example.com/webhook',
        parameters: webhook.parameters || { key1: 'value1', key2: 123 },
        developer_license_address: webhook.developer_license_address || '1234567890abcdef',
        status: webhook.status || 'Active',
        description: webhook.description || 'Default Description',
    };

    const response = await xior.post<Webhook>(`${API_BASE_URL}/webhooks`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    console.log("Create Webhook Response:", response.data);
    return response.data;
};

export const updateWebhook = async (id: string, webhook: Partial<Webhook>): Promise<Webhook> => {
    console.log("Updating webhook with ID:", id, "and payload:", webhook);

    const payload = {
        service: webhook.service,
        data: webhook.data,
        trigger: webhook.trigger,
        setup: webhook.setup,
        target_uri: webhook.target_uri,
        parameters: webhook.parameters,
        status: webhook.status,
        description: webhook.description,
    };

    const response = await xior.put<Webhook>(`${API_BASE_URL}/webhooks/${id}`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    console.log("Update Webhook Response:", response.data);
    return response.data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
    console.log("Deleting webhook with ID:", id);
    await xior.delete<void>(`${API_BASE_URL}/webhooks/${id}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });
    console.log(`Webhook with ID ${id} deleted successfully.`);
};

export const generateCEL = async (conditions: Condition[], logic: string): Promise<string> => {
    const response = await xior.post<GenerateCELResponse>(`${API_BASE_URL}/build-cel`, { conditions, logic }, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });
    return response.data.cel_expression;
};
