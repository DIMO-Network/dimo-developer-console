'use client';

import React from 'react';
import './Integrations.css';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookForm } from './WebhookForm';
import { WebhookTable } from './WebhookTable';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';

export const IntegrationsPage = () => {
    const {
        webhooks,
        currentWebhook,
        setCurrentWebhook,
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
        handleShowCreateForm,
    } = useWebhooks();

    return (
        <div className="integrations-container">
            <div className="integrations-header">
                <Title component="h1" className="integrations-title">
                    Webhooks
                </Title>
                <Button
                    className="create-webhook-button"
                    onClick={handleShowCreateForm}
                >
                    + Create New
                </Button>


            </div>
            <p className="integrations-description">
                Webhooks allow your application to receive real-time updates from events.
            </p>

            {currentWebhook && (
                <WebhookForm
                    currentWebhook={currentWebhook}
                    setCurrentWebhook={setCurrentWebhook}
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
