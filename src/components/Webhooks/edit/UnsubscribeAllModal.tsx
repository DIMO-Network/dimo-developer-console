import { useTranslations } from 'next-intl';
import React, { FC, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';
import { unsubscribeAllVehicles } from '@/services/webhook';
import { captureException } from '@sentry/nextjs';

export const UnsubscribeAllModal: FC<SubscribeVehiclesActionModalProps> = ({
  isOpen,
  setIsOpen,
  webhookId,
  clientId,
  onSuccess,
}) => {
  const t = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const devJwt = getDevJwt(clientId);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await unsubscribeAllVehicles({ webhookId, token: devJwt ?? '' });
      toast.success(t('webhooks.edit.unsubscribedAll'));
      onSuccess?.();
      setIsOpen(false);
    } catch (err) {
      captureException(err);
      toast.error(t('webhooks.edit.unsubscribeAllFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="flex w-full flex-col gap-12">
        <Title className={'text-panel-title'}>{t('webhooks.edit.unsubscribeAll')}</Title>
        <div className="flex flex-col gap-4">
          <p>{t('webhooks.edit.unsubscribeAllConfirm')}</p>
        </div>
        <div className="flex flex-col w-full gap-4 pt-4">
          <Button onClick={handleSubmit} variant="destructive" disabled={loading}>
            {loading
              ? t('webhooks.edit.unsubscribing')
              : t('webhooks.edit.unsubscribeAllButton')}
          </Button>
          <Button onClick={() => setIsOpen(false)} variant="secondary">
            {t('actions.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
