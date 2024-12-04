'use client';

import { useState, useEffect } from 'react';
import { fetchWebhooks, createWebhook, updateWebhook, deleteWebhook } from '@/services/webhook';
import './Integrations.css';
import { Webhook } from '@/types/webhook';

export const IntegrationsPage = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [currentWebhook, setCurrentWebhook] = useState<Partial<Webhook> | null>(null);
    const [parametersInput, setParametersInput] = useState<string>('{}');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);

    const loadWebhooks = async () => {
        try {
            const data = await fetchWebhooks();
            setWebhooks(data);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
        }
    };

    useEffect(() => {
        loadWebhooks();
    }, []);

    const handleCreate = async () => {
        try {
            const parsedParameters = JSON.parse(parametersInput);
            const payload = { ...currentWebhook, parameters: parsedParameters };
            await createWebhook(payload as Webhook);

            await loadWebhooks();
            setCurrentWebhook(null);
            setParametersInput('{}');
        } catch (error) {
            console.error('Error creating webhook:', error);
            alert('Invalid JSON in Parameters field.');
        }
    };

    const handleUpdate = async () => {
        if (!currentWebhook?.id) return;
        try {
            const parsedParameters = JSON.parse(parametersInput);
            const payload = {
                ...currentWebhook,
                parameters: parsedParameters,
            };
            await updateWebhook(currentWebhook.id, payload);

            await loadWebhooks();
            setCurrentWebhook(null);
            setParametersInput('{}');
        } catch (error) {
            console.error('Error updating webhook:', error);
            alert('Invalid JSON in Parameters field.');
        }
    };

    const handleEdit = (webhook: Webhook) => {
        setCurrentWebhook(webhook);
        setParametersInput(JSON.stringify(webhook.parameters, null, 2));
    };

    const handleCancel = () => {
        setCurrentWebhook(null);
        setParametersInput('{}');
    };

    const handleDeleteClick = (webhook: Webhook) => {
        setWebhookToDelete(webhook);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (webhookToDelete) {
            await deleteWebhook(webhookToDelete.id);
            await loadWebhooks();
            setWebhookToDelete(null);
            setShowDeleteConfirm(false);
        }
    };

    const cancelDelete = () => {
        setWebhookToDelete(null);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="integrations-container">
            <div className="integrations-header">
                <h1 className="integrations-title">Webhooks</h1>
                <button
                    className="create-webhook-button"
                    onClick={() => setCurrentWebhook({})}
                >
                    + Create New
                </button>
            </div>

            <p className="integrations-description">
                Webhooks allow your application to receive real-time updates from events. You can create, edit, and delete webhooks to integrate seamlessly with external services.
            </p>

            {currentWebhook && (
                <div className="webhook-form-container">
                    <h2>{currentWebhook.id ? 'Edit Webhook' : 'Create New Webhook'}</h2>
                    <label>Service</label>
                    <select
                        value={currentWebhook.service || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, service: e.target.value })
                        }
                    >
                        <option value="">Select a service</option>
                        <option value="Telemetry">Telemetry</option>
                        <option value="SACD">SACD</option>
                    </select>
                    <label>Event Name</label>
                    <input
                        type="text"
                        value={currentWebhook.data || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, data: e.target.value })
                        }
                    />
                    <label>Target URI</label>
                    <input
                        type="text"
                        value={currentWebhook.target_uri || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, target_uri: e.target.value })
                        }
                    />
                    <label>Setup</label>
                    <select
                        value={currentWebhook.setup || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, setup: e.target.value })
                        }
                    >
                        <option value="Realtime">Realtime</option>
                        <option value="Hourly">Hourly</option>
                    </select>
                    <label>Status</label>
                    <select
                        value={currentWebhook.status || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, status: e.target.value })
                        }
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <label>Parameters (JSON)</label>
                    <textarea
                        value={parametersInput}
                        onChange={(e) => setParametersInput(e.target.value)}
                        placeholder="Enter JSON parameters"
                    />
                    <div className="webhook-form-actions">
                        <button
                            className="save-button"
                            onClick={currentWebhook.id ? handleUpdate : handleCreate}
                        >
                            Save
                        </button>
                        <button className="cancel-button" onClick={handleCancel}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="webhook-table-container">
                <table className="webhook-table">
                    <thead>
                    <tr>
                        <th>Service</th>
                        <th>Event Name</th>
                        <th>Target URI</th>
                        <th>Status</th>
                        <th>Setup</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {webhooks.map((webhook) => (
                        <tr key={webhook.id}>
                            <td>{webhook.service}</td>
                            <td>{webhook.data}</td>
                            <td>{webhook.target_uri}</td>
                            <td>{webhook.status}</td>
                            <td>{webhook.setup}</td>
                            <td className="webhook-actions">
                                <button
                                    className="edit-webhook-button"
                                    onClick={() => handleEdit(webhook)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="delete-webhook-button"
                                    onClick={() => handleDeleteClick(webhook)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {showDeleteConfirm && (
                <div className="delete-confirm-overlay">
                    <div className="delete-confirm-modal">
                        <h2>Confirm Deletion</h2>
                        <p>Are you sure you want to delete this webhook? This action cannot be undone.</p>
                        <div className="delete-confirm-actions">
                            <button className="delete-webhook-button" onClick={confirmDelete}>
                                Delete
                            </button>
                            <button className="cancel-button" onClick={cancelDelete}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
