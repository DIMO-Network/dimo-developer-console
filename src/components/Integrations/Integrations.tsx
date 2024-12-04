'use client';

import { useState, useEffect } from 'react';
import { fetchWebhooks, createWebhook, updateWebhook, deleteWebhook } from '@/services/webhook';
import { Button } from '@/components/Button';
import { Webhook } from '@/types/webhook';
import './Integrations.css';

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
        try {
            const newWebhook = await createWebhook();
            setWebhooks((prev) => [...prev, newWebhook]);
        } catch (error) {
            console.error('Error creating webhook:', error);
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            const updatedWebhook = await updateWebhook(id);
            setWebhooks((prev) =>
                prev.map((webhook) =>
                    webhook.id === id ? { ...webhook, ...updatedWebhook } : webhook
                )
            );
        } catch (error) {
            console.error('Error updating webhook:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteWebhook(id);
            setWebhooks((prev) => prev.filter((webhook) => webhook.id !== id));
        } catch (error) {
            console.error('Error deleting webhook:', error);
        }
    };

    return (
        <div className="integrations-container">
            <header className="integrations-header">
                <h1 className="integrations-title">Webhooks</h1>
                <Button
                    onClick={handleCreate}
                    className="create-webhook-button"
                >
                    + Create New
                </Button>
            </header>
            <p className="integrations-description">
                Webhooks let you receive real-time event notifications when specific conditions are met for your vehicles.
            </p>
            <div className="webhook-table-container">
                <table className="webhook-table">
                    <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>Target URI</th>
                        <th>Status</th>
                        <th>Setup</th>
                        <th>Last Triggered</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {webhooks.length > 0 ? (
                        webhooks.map((webhook) => (
                            <tr key={webhook.id}>
                                <td>{webhook.service}</td>
                                <td>{webhook.target_uri}</td>
                                <td className="capitalize">{webhook.status}</td>
                                <td>{webhook.setup}</td>
                                <td>{webhook.updated_at || 'Never'}</td>
                                <td className="webhook-actions">
                                    <Button
                                        onClick={() => handleUpdate(webhook.id)}
                                        className="edit-webhook-button"
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="delete-webhook-button"
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        className={`${
                                            webhook.status === 'active'
                                                ? 'deactivate-webhook-button'
                                                : 'activate-webhook-button'
                                        }`}
                                    >
                                        {webhook.status === 'active'
                                            ? 'Deactivate'
                                            : 'Activate'}
                                    </Button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="no-webhooks-message">
                                No webhooks found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default IntegrationsPage;
