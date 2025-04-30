import React, { useContext, useState } from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  webhook: Webhook;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const DeleteWebhookModal: React.FC<IProps> = ({ webhook, isOpen, setIsOpen }) => {
  const [, setIsLoading] = useState(false);
  const { setNotification } = useContext(NotificationContext);

  const onDelete = async () => {
    try {
      setIsLoading(true);
      setNotification('Successfully deleted webhook', '', 'success');
    } catch (err) {
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
        <Title>Delete Webhook</Title>
        <div className={'flex flex-col gap-4'}>
          <p>
            Are you sure you want to delete this webhook? This action cannot be undone.
          </p>
          <WebhookDetailsCard webhook={webhook} />
        </div>
        <div className={'flex flex-col gap-4'}>
          <Button onClick={onDelete} className={'error'}>
            Delete Webhook
          </Button>
          <Button className={'primary-outline'} onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
