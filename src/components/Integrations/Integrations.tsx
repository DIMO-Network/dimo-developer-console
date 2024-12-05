'use client';

import { useState, useEffect } from 'react';
import { fetchWebhooks, createWebhook, updateWebhook, deleteWebhook, fetchSignalNames } from '@/services/webhook';
import './Integrations.css';
import { Webhook, Condition } from '@/types/webhook';
import { generateCEL } from '@/services/webhook';


export const IntegrationsPage = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [currentWebhook, setCurrentWebhook] = useState<Partial<Webhook> | null>(null);
    const [parametersInput, setParametersInput] = useState<string>('{}');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
    const [signalNames, setSignalNames] = useState<string[]>([]);
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [logic, setLogic] = useState('AND');
    const [generatedCEL, setGeneratedCEL] = useState('');


    const loadWebhooks = async () => {
        try {
            const data = await fetchWebhooks();
            setWebhooks(data);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
        }
    };

    const loadSignalNames = async () => {
        try {
            const signals = await fetchSignalNames();
            setSignalNames(signals);
        } catch (error) {
            console.error('Error fetching signal names:', error);
        }
    };
    useEffect(() => {
        loadWebhooks();
        loadSignalNames();
    }, []);

    const handleCreate = async () => {
        try {
            const parsedParameters = JSON.parse(parametersInput);
            const payload = { ...currentWebhook, parameters: parsedParameters };
            console.log("Payload for creating webhook:", payload);
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
    const handleGenerateCEL = async () => {
        try {
            const celExpression = await generateCEL(conditions, logic);
            setGeneratedCEL(celExpression);
        } catch (error) {
            console.error('Failed to generate CEL:', error);
            alert('Error generating CEL. Check backend connectivity.');
        }
    };

    const addCondition = () => {
        setConditions([...conditions, { field: '', operator: '>', value: '' } as Condition]);
        handleGenerateCEL();
    };

    const updateCondition = (index: number, key: keyof Condition, value: string) => {
        const updatedConditions = [...conditions];
        updatedConditions[index][key] = value;
        setConditions(updatedConditions);
        handleGenerateCEL();
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
        handleGenerateCEL();
    };

    const handleLogicChange = (newLogic: string) => {
        setLogic(newLogic);
        handleGenerateCEL();
    };







    return (
        <div className="integrations-container">
            <div className="integrations-header">
                <h1 className="integrations-title">Webhooks</h1>
                <button
                    className="create-webhook-button"
                    onClick={() => {
                        setCurrentWebhook({});
                        setConditions([]);
                        setGeneratedCEL('');
                        setLogic('AND');
                    }}
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

                    <label>Description</label>
                    <p className="field-helper-text">Provide a short, human-readable description of the webhook.</p>
                    <textarea
                        value={currentWebhook.description || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, description: e.target.value })
                        }
                    />

                    <label>Target URI</label>
                    <p className="field-helper-text">Specify the endpoint where the webhook payload should be sent.</p>
                    <input
                        type="text"
                        value={currentWebhook.target_uri || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, target_uri: e.target.value })
                        }
                    />

                    <label>Service</label>
                    <p className="field-helper-text">Choose the service that this webhook pertains to.</p>
                    <select
                        value={currentWebhook.service || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, service: e.target.value })
                        }
                    >
                        <option value="Telemetry">Telemetry</option>
                        <option value="SACD">SACD</option>
                    </select>

                    <label>Trigger</label>
                    <p className="field-helper-text">Define conditions for triggering the webhook using dynamic criteria.</p>
                    <div className="trigger-conditions">
                        {conditions.map((condition, index) => (
                            <div key={index} className="condition-row">
                                <select
                                    value={condition.field}
                                    onChange={(e) =>
                                        updateCondition(index, 'field', e.target.value)
                                    }
                                >
                                    <option value="" disabled>Select Field (VSS Signal)</option>
                                    {signalNames.map((signal) => (
                                        <option key={signal} value={signal}>
                                            {signal}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={condition.operator}
                                    onChange={(e) =>
                                        updateCondition(index, 'operator', e.target.value)
                                    }
                                >
                                    <option value="&gt;">&gt;</option>
                                    <option value="&lt;">&lt;</option>
                                    <option value="==">==</option>
                                </select>

                                <input
                                    type="text"
                                    value={condition.value}
                                    onChange={(e) =>
                                        updateCondition(index, 'value', e.target.value)
                                    }
                                    placeholder="Value"
                                />
                                <button
                                    className="remove-condition-button"
                                    onClick={() => removeCondition(index)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button className="add-condition-button" onClick={addCondition}>
                            + Add Condition
                        </button>
                    </div>

                    <label>Logic</label>
                    <p className="field-helper-text">Choose how to combine conditions (AND/OR).</p>
                    <select
                        value={logic}
                        onChange={(e) => handleLogicChange(e.target.value)}
                    >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                    </select>

                    <label>Generated CEL</label>
                    <p className="field-helper-text">The dynamically generated CEL expression.</p>
                    <div className="generated-cel">
                        <code>{generatedCEL || 'CEL expression will appear here...'}</code>
                    </div>


                    <label>Setup</label>
                    <p className="field-helper-text">Choose the frequency for sending webhook notifications.</p>
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
                    <p className="field-helper-text">Set the current status of the webhook (Active or Inactive).</p>
                    <select
                        value={currentWebhook.status || ''}
                        onChange={(e) =>
                            setCurrentWebhook({ ...currentWebhook, status: e.target.value })
                        }
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>

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
                        <th>Description</th>
                        <th>Trigger</th>
                        <th>Target URI</th>
                        <th>Status</th>
                        <th>Setup</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {webhooks.map((webhook) => (
                        <tr key={webhook.id}>
                            <td>{webhook.description}</td>
                            <td>{webhook.trigger}</td>
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
