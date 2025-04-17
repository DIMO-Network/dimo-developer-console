import React from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';

interface TestWebhookModalProps {
  webhook: Webhook | null;
  onTest: () => void;
  onCancel: () => void;
}

export const TestWebhookModal: React.FC<TestWebhookModalProps> = ({
  webhook,
  onTest,
  onCancel,
}) => {
  if (!webhook) return null;

  return (
    <div className="test-webhook-overlay">
      <div className="test-webhook-modal">
        <Title component="h2">Test Webhook</Title>
        <p>
          Would you like to test this webhook? A test request will be sent to the
          specified target URI.
        </p>
        <div className="test-webhook-actions">
          <Button className="run-webhook-button" onClick={onTest}>
            Run
          </Button>
          <Button className="cancel-button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
