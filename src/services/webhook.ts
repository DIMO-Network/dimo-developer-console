import axios from 'axios';
import { Webhook, Condition } from '@/types/webhook';

const API_BASE_URL = 'http://localhost:3003';


export const fetchSignalNames = async (): Promise<string[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/webhooks/signals`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        console.log("Fetch Signal Names Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching signal names:", error);
        throw error;
    }
};

// Fetch all webhooks
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

// Create a new webhook
export const createWebhook = async (webhook: Partial<Webhook>): Promise<Webhook> => {
    console.log("Creating webhook with payload:", webhook);
    try {
        const payload = {
            service: webhook.service || 'Telemetry',
            //data: webhook.data || 'DefaultData',
            trigger: webhook.trigger || 'Conditions Empty',
            setup: webhook.setup || 'Realtime',
            target_uri: webhook.target_uri || 'https://example.com/webhook',
            parameters: webhook.parameters || { key1: 'value1', key2: 123 },
            developer_license_address: webhook.developer_license_address || '1234567890abcdef',
            status: webhook.status || 'Active',
            description: webhook.description || 'Default Description',
        };

        const response = await axios.post(`${API_BASE_URL}/webhooks`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
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

        const response = await axios.put(`${API_BASE_URL}/webhooks/${id}`, payload, {
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
    try {
        console.log("Deleting webhook with ID:", id);
        await axios.delete(`${API_BASE_URL}/webhooks/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        console.log(`Webhook with ID ${id} deleted successfully.`);
    } catch (error) {
        console.error("Error deleting webhook:", error);
        throw error;
    }
};

export const generateCEL = async (conditions: Condition[], logic: string): Promise<string> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/build-cel`, { conditions, logic }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        return response.data.cel_expression;
    } catch (error) {
        console.error('Error generating CEL:', error);
        throw error;
    }
};
