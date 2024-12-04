import axios from 'axios';
import { Webhook } from '@/types/webhook';

const API_BASE_URL = 'http://localhost:3003';

export const fetchWebhooks = async (): Promise<Webhook[]> => {
    console.log('Fetching webhooks from:', `${API_BASE_URL}/webhooks`);
    try {
        const response = await axios.get(`${API_BASE_URL}/webhooks`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        console.log("Fetch Webhooks Response:", response);
        return response.data;
    } catch (error) {
        console.error("Error fetching webhooks:", error);
        throw error;
    }
};

export const createWebhook = async (webhook: Partial<Webhook>): Promise<Webhook> => {
    console.log("Creating webhook with payload:", webhook);
    try {
        const payload = {
            service: webhook.service || 'DefaultService',
            data: webhook.data || 'DefaultData',
            trigger: webhook.trigger || 'OnCreate',
            setup: webhook.setup || 'Realtime',
            target_uri: webhook.target_uri || 'https://example.com/webhook',
            parameters: webhook.parameters || { key1: 'value1', key2: 123 },
            developer_license_address: webhook.developer_license_address || '1234567890abcdef',
            status: webhook.status || 'Active',
        };

        const response = await axios.post(`${API_BASE_URL}/webhooks`, payload, {
            headers: {
                Accept: 'application/json',
            },
        });
        console.log("Create Webhook Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating webhook:", error);
        throw error;
    }
};



// Update a webhook
export const updateWebhook = async (id: string, webhook: Partial<Webhook>): Promise<Webhook> => {
    try {
        console.log("Updating webhook with ID:", id, "and payload:", webhook);

        const response = await axios.put(`${API_BASE_URL}/webhooks/${id}`, webhook, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        console.log("Update Webhook Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error updating webhook:", error);
        throw error;
    }
};


// Delete a webhook
export const deleteWebhook = async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/webhooks/${id}`);
};
