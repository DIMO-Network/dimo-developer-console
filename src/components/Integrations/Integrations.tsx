'use client';

import { useState, useEffect } from 'react';
import { fetchWebhooks, createWebhook, updateWebhook, deleteWebhook } from '@/services/webhook';
import './Integrations.css';
import { Webhook } from '@/types/webhook';

export const IntegrationsPage = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);

    useEffect(() => {
        const loadWebhooks = async () => {
            try {
                const data = await fetchWebhooks();
                setWebhooks(data);
            } catch (error) {
                console.error('Error fetching webhooks:', error);
            }
        };
        loadWebhooks();
    }, []);

    const handleCreate = async () => {
        const newWebhook = await createWebhook();
        setWebhooks((prev) => [...prev, newWebhook]);
    };

    const handleUpdate = async (id: string) => {
        const updatedWebhook = await updateWebhook(id);
        setWebhooks((prev) =>
            prev.map((webhook) => (webhook.id === id ? { ...webhook, ...updatedWebhook } : webhook))
        );
    };

    const handleDelete = async (id: string) => {
        await deleteWebhook(id);
        setWebhooks((prev) => prev.filter((webhook) => webhook.id !== id));
    };

    return (
        <div className="integrations-page">
            <h1>Integrations</h1>
            <button onClick={handleCreate}>Create Webhook</button>
            <ul>
                {webhooks.map((webhook) => (
                    <li key={webhook.id}>
                        <span>{webhook.service} - {webhook.target_uri}</span>
                        <button onClick={() => handleUpdate(webhook.id)}>Update</button>
                        <button onClick={() => handleDelete(webhook.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
