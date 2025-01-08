import React from 'react';
import { Webhook } from '@/types/webhook';

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
                <h2>Confirm Deletion</h2>
                <p>
                    Are you sure you want to delete this webhook? This action cannot be undone.
                </p>
                <div className="delete-confirm-actions">
                    <button className="delete-webhook-button" onClick={onDelete}>
                        Delete
                    </button>
                    <button className="cancel-button" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
