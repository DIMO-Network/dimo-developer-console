import React from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';

interface WebhookTableProps {
    webhooks: Webhook[];
    onEdit: (webhook: Webhook) => void;
    onDelete: (webhook: Webhook) => void;
    onTest: (webhook: Webhook) => void;
    expandedWebhook: string | null;
    setExpandedWebhook: React.Dispatch<React.SetStateAction<string | null>>;
}

export const WebhookTable: React.FC<WebhookTableProps> = ({
                                                              webhooks,
                                                              onEdit,
                                                              onDelete,
                                                              onTest,
                                                              expandedWebhook,
                                                              setExpandedWebhook,
                                                          }) => {
    const toggleExpand = (webhookId: string) => {
        setExpandedWebhook((prev) => (prev === webhookId ? null : webhookId));
    };

    return (
        <div className="webhook-table-container">
            <table className="webhook-table">
                <thead>
                <tr>
                    <th>Description</th>
                    <th>Service</th>
                    <th>Target URI</th>
                    <th>Status</th>
                    <th>Setup</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {webhooks.map((webhook) => (
                    <React.Fragment key={webhook.id}>
                        <tr onClick={() => toggleExpand(webhook.id)}>
                            <td>{webhook.description}</td>
                            <td>{webhook.service}</td>
                            <td>{webhook.target_uri}</td>
                            <td>{webhook.status}</td>
                            <td>{webhook.setup}</td>
                            <td className="webhook-actions">
                                <Button
                                    className="edit-webhook-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(webhook);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    className="delete-webhook-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(webhook);
                                    }}
                                >
                                    Delete
                                </Button>
                                <Button
                                    className="test-webhook-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTest(webhook);
                                    }}
                                >
                                    Test
                                </Button>
                            </td>

                        </tr>
                        {expandedWebhook === webhook.id && (
                            <tr className="expanded-row">
                                <td colSpan={6}>
                                    <div className="expanded-content">
                                        <h4>CEL Expression</h4>
                                        <p>{webhook.trigger}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
                </tbody>
            </table>
        </div>
    );
};