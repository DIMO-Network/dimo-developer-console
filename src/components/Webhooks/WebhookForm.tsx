import React from 'react';
import { Webhook, Condition } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';

interface WebhookFormProps {
    currentWebhook: Partial<Webhook>;
    setCurrentWebhook: React.Dispatch<React.SetStateAction<Partial<Webhook> | null>>;
    conditions: Condition[];
    setConditions: React.Dispatch<React.SetStateAction<Condition[]>>;
    logic: string;
    setLogic: React.Dispatch<React.SetStateAction<string>>;
    signalNames: string[];
    generatedCEL: string;
    onSave: () => void;
    onCancel: () => void;
}

export const WebhookForm: React.FC<WebhookFormProps> = ({
                                                            currentWebhook,
                                                            setCurrentWebhook,
                                                            conditions,
                                                            setConditions,
                                                            logic,
                                                            setLogic,
                                                            signalNames,
                                                            generatedCEL,
                                                            onSave,
                                                            onCancel,
                                                        }) => {
    const addCondition = () => {
        setConditions([...conditions, { field: '', operator: '>', value: '' }]);
    };

    const updateCondition = (index: number, key: keyof Condition, value: string) => {
        const updatedConditions = [...conditions];
        updatedConditions[index][key] = value;
        setConditions(updatedConditions);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    return (
        <div className="webhook-form-container">
            <Title>{currentWebhook.id ? 'Edit Webhook' : 'Create New Webhook'}</Title>

            <label>Description</label>
            <textarea
                value={currentWebhook.description || ''}
                onChange={(e) =>
                    setCurrentWebhook({ ...currentWebhook, description: e.target.value })
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

            <label>Service</label>
            <select
                value={currentWebhook.service || ''}
                onChange={(e) =>
                    setCurrentWebhook({ ...currentWebhook, service: e.target.value })
                }
            >
                <option value="Telemetry">Telemetry</option>
                <option value="SACD">SACD</option>
            </select>

            <label>Signal Name</label>
            <select
                value={currentWebhook.signalName || ''}
                onChange={(e) =>
                    setCurrentWebhook({ ...currentWebhook, signalName: e.target.value })
                }
            >
                <option value="" disabled>Select Signal</option>
                {signalNames.map((signal) => (
                    <option key={signal} value={signal}>
                        {signal}
                    </option>
                ))}
            </select>

            <label>Trigger (CEL Expression)</label>
            <input
                type="text"
                value={currentWebhook.trigger || ''}
                onChange={(e) =>
                    setCurrentWebhook({ ...currentWebhook, trigger: e.target.value })
                }
            />

            <div className="trigger-conditions">
                {conditions.map((condition, index) => (
                    <div key={index} className="condition-row">
                        <select
                            value={condition.field}
                            onChange={(e) => updateCondition(index, 'field', e.target.value)}
                        >
                            <option value="" disabled>Select Field</option>
                            {signalNames.map((signal) => (
                                <option key={signal} value={signal}>
                                    {signal}
                                </option>
                            ))}
                        </select>
                        <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        >
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="==">==</option>
                        </select>
                        <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        />
                        <Button type="button" onClick={() => removeCondition(index)} className="remove-condition-button">
                            Remove
                        </Button>
                    </div>
                ))}
                <Button type="button" onClick={addCondition} className="add-condition-button">
                    + Add Condition
                </Button>
            </div>

            <label>Logic</label>
            <select value={logic} onChange={(e) => setLogic(e.target.value)}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
            </select>

            <label>Generated CEL</label>
            <div className="generated-cel">
                <code>{generatedCEL || 'CEL expression will appear here...'}</code>
            </div>

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

            <div className="webhook-form-actions">
                <Button onClick={onSave} className="edit-webhook-button">
                    Save
                </Button>
                <Button onClick={onCancel} className="delete-webhook-button">
                    Cancel
                </Button>
            </div>
        </div>
    );
};
