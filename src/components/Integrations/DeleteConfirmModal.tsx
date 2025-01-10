import React from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';

interface DeleteConfirmModalProps {
    webhook: Webhook | null;
    onDelete: () => void;
    onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
      webhook,
      onDelete,
      onCancel,
  }) => {
    if (!webhook) return null;

    return (
        <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
                <Title component="h2">Confirm Deletion</Title>
                <p>
                    Are you sure you want to delete this webhook? This action cannot be undone.
                </p>
                <div className="delete-confirm-actions">
                    <Button
                        className="delete-webhook-button"
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                    <Button
                        className="cancel-button"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};
