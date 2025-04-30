import React, { useContext, useState } from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { NotificationContext } from '@/context/notificationContext';

interface TestWebhookModalProps {
  webhook: Webhook;
  onTest: () => void;
  onCancel: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const TestWebhookModal: React.FC<TestWebhookModalProps> = ({
  isOpen,
  setIsOpen,
  webhook,
}) => {
  const [, setIsLoading] = useState(false);
  const { setNotification } = useContext(NotificationContext);

  const onTest = async () => {
    try {
      setIsLoading(true);
      // TODO - implement test
      setNotification('Successfully sent test!', '', 'success');
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
      <div className={'flex flex-col gap-12'}>
        <Title>Test Webhook</Title>
        <div className={'flex flex-col gap-4'}>
          <p>
            Would you like to test this webhook? A test will be sent to the specified
            Target URI.
          </p>
          <WebhookDetailsCard webhook={webhook} />
        </div>
        <div className={'flex flex-col gap-4'}>
          <Button onClick={onTest}>Send a test</Button>
          <Button className={'primary-outline'} onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
