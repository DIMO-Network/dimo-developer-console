'use client';

import React from 'react';
import './Integrations.css';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookForm } from './WebhookForm';
import { WebhookTable } from './WebhookTable';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const IntegrationsPage = () => {
    const {
        webhooks,
        currentWebhook,
        setCurrentWebhook,
        parametersInput,
        setParametersInput,
        conditions,
        setConditions,
        logic,
        setLogic,
        signalNames,
        generatedCEL,
        expandedWebhook,
        setExpandedWebhook,
        showDeleteConfirm,
        setShowDeleteConfirm,
        webhookToDelete,
        setWebhookToDelete,
        handleCreate,
        handleUpdate,
        handleDelete,
        resetForm,
    } = useWebhooks();

    return (
        <div className="integrations-container">
            <div className="integrations-header">
                <h1 className="integrations-title">Webhooks</h1>
                <button
                    className="create-webhook-button"
                    onClick={() => {
                        resetForm();
                        setCurrentWebhook({
                            description: 'My Cool Webhook',
                            target_uri: 'https://example.com/webhook',
                        });
                    }}
                >
                    + Create New
                </button>
            </div>
            <p className="integrations-description">
                Webhooks allow your application to receive real-time updates from events.
            </p>

            {currentWebhook && (
                <WebhookForm
                    currentWebhook={currentWebhook}
                    setCurrentWebhook={setCurrentWebhook}
                    parametersInput={parametersInput}
                    setParametersInput={setParametersInput}
                    conditions={conditions}
                    setConditions={setConditions}
                    logic={logic}
                    setLogic={setLogic}
                    signalNames={signalNames}
                    generatedCEL={generatedCEL}
                    onSave={currentWebhook.id ? handleUpdate : handleCreate}
                    onCancel={resetForm}
                />
            )}

            <WebhookTable
                webhooks={webhooks}
                onEdit={setCurrentWebhook}
                onDelete={(webhook) => {
                    setWebhookToDelete(webhook);
                    setShowDeleteConfirm(true);
                }}
                expandedWebhook={expandedWebhook}
                setExpandedWebhook={setExpandedWebhook}
            />

            {showDeleteConfirm && (
                <DeleteConfirmModal
                    webhook={webhookToDelete}
                    onDelete={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
};
