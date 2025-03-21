// /src/components/Webhooks/WebhooksPage.tsx
'use client';

import React, { useState } from 'react';
import './Webhooks.css';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookForm } from './WebhookForm';
import { WebhookTable } from './WebhookTable';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { TestWebhookModal } from './TestWebhookModal';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';

export const WebhooksPage = () => {
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

    const [showTestModal, setShowTestModal] = useState(false);
    const [webhookToTest, setWebhookToTest] = useState(null);

    const handleRunWebhookTest = async () => {
        if (!webhookToTest) return;
        try {
            const fakeData = { event: 'test_event', data: 'This is test data' };
            const response = await fetch(webhookToTest.target_uri, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fakeData),
            });
            if (response.ok) {
                alert('Webhook triggered successfully.');
            } else {
                alert('Failed to trigger webhook. Please check the target URL.');
            }
        } catch (error) {
            console.error('Error testing webhook:', error);
            alert('An error occurred while testing the webhook.');
        } finally {
            setShowTestModal(false);
        }
    };

    return (
        <div className="webhooks-container">
            <div className="webhooks-header">
                <Title component="h1" className="webhooks-title">
                    Webhooks
                </Title>
                <Button className="create-webhook-button" onClick={handleShowCreateForm}>
                    + Create New
                </Button>
            </div>
            <p className="webhooks-description">
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
                onTest={(webhook) => {
                    setWebhookToTest(webhook);
                    setShowTestModal(true);
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

            {showTestModal && webhookToTest && (
                <TestWebhookModal
                    webhook={webhookToTest}
                    onRun={handleRunWebhookTest}
                    onCancel={() => setShowTestModal(false)}
                />
            )}
        </div>
    );
};
