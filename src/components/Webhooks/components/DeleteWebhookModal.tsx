import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { NotificationContext } from '@/context/notificationContext';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useWebhooks } from '@/hooks/useWebhooks';

interface IProps {
  webhook: Webhook;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  clientId: string;
}

export const DeleteWebhookModal: React.FC<IProps> = ({
  webhook,
  isOpen,
  setIsOpen,
  clientId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { setNotification } = useContext(NotificationContext);
  const { refetch } = useWebhooks(clientId, { enabled: false });
  const onDelete = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotification('Successfully deleted webhook', '', 'success');
      setIsDeleted(true);
      refetch();
    } catch (err) {
      let errorMessage = 'There was an error testing your webhook';
      if (err instanceof Error) {
        errorMessage = err.message ?? errorMessage;
      }
      setNotification(errorMessage, '', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [setNotification]);

  const title = useMemo(() => {
    if (isLoading) {
      return 'Deleting webhook...';
    }
    if (isDeleted) {
      return 'Success';
    }
    return 'Delete Webhook';
  }, [isDeleted, isLoading]);

  const Body = useMemo(() => {
    if (isLoading) {
      return (
        <div className={'flex flex-1 justify-center items-center'}>
          <BubbleLoader isLoading={true} />
        </div>
      );
    }
    if (isDeleted) {
      return <p>Webhook successfully deleted</p>;
    }
    return (
      <div className={'flex flex-col gap-4'}>
        <p>Are you sure you want to delete this webhook? This action cannot be undone.</p>
        <WebhookDetailsCard webhook={webhook} />
      </div>
    );
  }, [isDeleted, isLoading, webhook]);

  const Footer = useMemo(() => {
    if (isLoading) return null;
    if (isDeleted)
      return (
        <Button onClick={() => setIsOpen(false)} className={'primary-outline'}>
          Done
        </Button>
      );
    return (
      <div className={'flex flex-col gap-4'}>
        <Button onClick={onDelete} className={'error'}>
          Delete Webhook
        </Button>
        <Button className={'primary-outline'} onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    );
  }, [isDeleted, isLoading, onDelete, setIsOpen]);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className={'flex w-full flex-col gap-12'}>
        <Title>{title}</Title>
        {Body}
        {Footer}
      </div>
    </Modal>
  );
};
