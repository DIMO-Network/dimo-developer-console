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

export const createWebhook = async (): Promise<Webhook> => {
    console.log("Creating webhook...");
    try {
        const payload = {
            service: 'DemoService',
            data: 'DemoData',
            trigger: 'OnCreate',
            setup: 'Realtime',
            target_uri: 'https://example.com/webhook',
            parameters: { key1: 'value1', key2: 123 },
            developer_license_address: '1234567890abcdef',
            status: 'Active',
        };
        console.log("Payload for creating webhook:", payload);

        const response = await axios.post(`${API_BASE_URL}/webhooks`, payload);
        console.log("Create Webhook Response:", response);
        return response.data;
    } catch (error) {
        console.error("Error creating webhook:", error);
        throw error;
    }
};


// Update a webhook
export const updateWebhook = async (id: string): Promise<Webhook> => {
    const response = await axios.put(`${API_BASE_URL}/webhooks/${id}`, {
        setup: 'Hourly',
        target_uri: 'https://example.com/updated-webhook',
        parameters: { key3: 'valueUpdated' },
    });
    return response.data;
};

// Delete a webhook
export const deleteWebhook = async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/webhooks/${id}`);
};
