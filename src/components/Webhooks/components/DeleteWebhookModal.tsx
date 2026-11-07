import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deleteWebhook } from '@/services/webhook';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { toast } from 'sonner';
import { BubbleLoader } from '@/components/BubbleLoader';
import { getDevJwt } from '@/utils/devJwt';
import { captureException } from '@sentry/nextjs';
import { useHasSubscribedVehicles } from '@/components/Webhooks/hooks/useHasSubscribedVehicles';

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
  const t = useTranslations('common');
  const [isDeleted, setIsDeleted] = useState(false);
  const hasSubscribedVehicles = useHasSubscribedVehicles(webhook.id, clientId);

  const onDelete = () => {
    if (hasSubscribedVehicles) {
      throw new Error(t('webhooks.delete.mustUnsubscribe'));
    }
    return deleteWebhook({ webhookId: webhook.id, token: getDevJwt(clientId) ?? '' });
  };

  const onClose = useCallback(() => {
    if (isDeleted) {
      setIsDeleted(false);
    }
    setIsOpen(false);
  }, [isDeleted, setIsOpen]);

  const { mutate, isPending } = useMutation({
    mutationFn: onDelete,
    onSuccess: () => {
      toast.success(t('webhooks.delete.deleted'));
      setIsDeleted(true);
      onSuccess?.();
    },
    onError: (err) => {
      let errorMessage = t('webhooks.delete.error');
      if (err instanceof Error) {
        errorMessage = err.message ?? errorMessage;
      }
      captureException(err);
      toast.error(errorMessage);
    },
  });

  const modalState = isPending ? 'loading' : isDeleted ? 'success' : 'confirm';

  const titleMap = {
    loading: t('webhooks.delete.deleting'),
    success: t('webhooks.delete.success'),
    confirm: t('webhooks.delete.title'),
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={onClose}>
      <div className="flex w-full flex-col gap-12">
        <Title className={'text-panel-title'}>{titleMap[modalState]}</Title>
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
  const t = useTranslations('common');
  if (modalState === 'loading') {
    return (
      <div className="flex flex-1 justify-center items-center">
        <BubbleLoader isLoading />
      </div>
    );
  }
  if (modalState === 'success') {
    return <p>{t('webhooks.delete.successBody')}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p>{t('webhooks.delete.confirm')}</p>
      <WebhookDetailsCard webhook={webhook} />
    </div>
  );
};

const DeleteWebhookFooter: React.FC<{
  modalState: string;
  onClose: () => void;
  onDelete: () => void;
}> = ({ modalState, onClose, onDelete }) => {
  const t = useTranslations('common');
  if (modalState === 'loading') return null;
  if (modalState === 'success') {
    return (
      <Button onClick={onClose} variant="secondary">
        {t('webhooks.delete.done')}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Button onClick={onDelete} variant="destructive">
        {t('webhooks.delete.title')}
      </Button>
      <Button variant="secondary" onClick={onClose}>
        {t('actions.cancel')}
      </Button>
    </div>
  );
};
