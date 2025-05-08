import React, { useCallback, useContext, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deleteWebhook } from '@/services/webhook';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { NotificationContext } from '@/context/notificationContext';
import { BubbleLoader } from '@/components/BubbleLoader';
import { getDevJwt } from '@/utils/devJwt';

interface IProps {
  webhook: Webhook;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess?: () => void;
  clientId: string;
}

export const DeleteWebhookModal: React.FC<IProps> = ({
  webhook,
  isOpen,
  setIsOpen,
  onSuccess,
  clientId,
}) => {
  const [isDeleted, setIsDeleted] = useState(false);
  const { setNotification } = useContext(NotificationContext);

  const onClose = useCallback(() => {
    if (isDeleted) {
      setIsDeleted(false);
    }
    setIsOpen(false);
  }, [isDeleted, setIsOpen]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      deleteWebhook({ webhookId: webhook.id, token: getDevJwt(clientId) ?? '' }),
    onSuccess: () => {
      setNotification('Successfully deleted webhook', '', 'success');
      setIsDeleted(true);
      onSuccess?.();
    },
    onError: (err) => {
      let errorMessage = 'There was an error deleting your webhook';
      if (err instanceof Error) {
        errorMessage = err.message ?? errorMessage;
      }
      setNotification(errorMessage, '', 'error');
    },
  });

  const modalState = isPending ? 'loading' : isDeleted ? 'success' : 'confirm';

  const titleMap = {
    loading: 'Deleting webhook...',
    success: 'Success',
    confirm: 'Delete Webhook',
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={onClose}>
      <div className="flex w-full flex-col gap-12">
        <Title>{titleMap[modalState]}</Title>
        <DeleteWebhookBody modalState={modalState} webhook={webhook} />
        <DeleteWebhookFooter
          modalState={modalState}
          onClose={onClose}
          onDelete={() => mutate()}
        />
      </div>
    </Modal>
  );
};

const DeleteWebhookBody: React.FC<{ modalState: string; webhook: Webhook }> = ({
  modalState,
  webhook,
}) => {
  if (modalState === 'loading') {
    return (
      <div className="flex flex-1 justify-center items-center">
        <BubbleLoader isLoading />
      </div>
    );
  }
  if (modalState === 'success') {
    return <p>Webhook successfully deleted</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p>Are you sure you want to delete this webhook? This action cannot be undone.</p>
      <WebhookDetailsCard webhook={webhook} />
    </div>
  );
};

const DeleteWebhookFooter: React.FC<{
  modalState: string;
  onClose: () => void;
  onDelete: () => void;
}> = ({ modalState, onClose, onDelete }) => {
  if (modalState === 'loading') return null;
  if (modalState === 'success') {
    return (
      <Button onClick={onClose} className="primary-outline">
        Done
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Button onClick={onDelete} className="error">
        Delete Webhook
      </Button>
      <Button className="primary-outline" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
};
