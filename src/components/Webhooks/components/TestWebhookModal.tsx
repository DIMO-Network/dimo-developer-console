import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { NotificationContext } from '@/context/notificationContext';
import { BubbleLoader } from '@/components/BubbleLoader';
import { extractAxiosMessage } from '@/utils/api';

interface TestWebhookModalProps {
  webhook: Webhook;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const TestWebhookModal: React.FC<TestWebhookModalProps> = ({
  isOpen,
  setIsOpen,
  webhook,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setNotification } = useContext(NotificationContext);

  const handleRunWebhookTest = async () => {
    try {
      const fakeData = { event: 'test_event', data: 'This is test data' };
      await axios.post(webhook.target_uri, fakeData, {
        headers: { 'Content-Type': 'application/json' },
      });
      setNotification('Webhook triggered successfully.', '', 'success');
    } catch (err: unknown) {
      const message = extractAxiosMessage(err, 'An error occurred testing the webhook');
      setNotification(message, '', 'error');
    }
  };

  const onTest = async () => {
    try {
      setIsLoading(true);
      await handleRunWebhookTest();
    } catch (err: unknown) {
      let errorMessage = 'There was an error testing your webhook';
      if (err instanceof Error) {
        errorMessage = err.message ?? errorMessage;
      }
      setNotification(errorMessage, '', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="flex flex-col flex-1 w-full gap-12">
        <Title>{isLoading ? 'Sending a test...' : 'Test Webhook'}</Title>
        <TestWebhookBody isLoading={isLoading} webhook={webhook} />
        <TestWebhookFooter
          isLoading={isLoading}
          onTest={onTest}
          onCancel={() => setIsOpen(false)}
        />
      </div>
    </Modal>
  );
};

const TestWebhookBody: React.FC<{
  isLoading: boolean;
  webhook: Webhook;
}> = ({ isLoading, webhook }) => {
  if (isLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <BubbleLoader isLoading />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>
        Would you like to test this webhook? A test will be sent to the specified Target
        URI.
      </p>
      <WebhookDetailsCard webhook={webhook} />
    </div>
  );
};

const TestWebhookFooter: React.FC<{
  isLoading: boolean;
  onTest: () => void;
  onCancel: () => void;
}> = ({ isLoading, onTest, onCancel }) => {
  if (isLoading) return null;

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={onTest}>Send a test</Button>
      <Button className="primary-outline" onClick={onCancel}>
        Close
      </Button>
    </div>
  );
};
