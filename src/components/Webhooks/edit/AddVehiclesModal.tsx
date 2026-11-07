import { useTranslations } from 'next-intl';
import { FC, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { toast } from 'sonner';
import { subscribeVehicles } from '@/services/webhook';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { AssetDIDsInput } from '@/components/AssetDIDsInput';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';
import { captureException } from '@sentry/nextjs';

export const AddVehiclesModal: FC<SubscribeVehiclesActionModalProps> = ({
  isOpen,
  setIsOpen,
  webhookId,
  clientId,
  onSuccess,
}) => {
  const t = useTranslations('common');
  const [assetDIDs, setAssetDIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string>('');
  const devJwt = getDevJwt(clientId);

  const handleSubmit = async () => {
    if (assetDIDs.length === 0) {
      setInputError(t('webhooks.edit.enterAssetDid'));
      return;
    }

    try {
      setLoading(true);
      setInputError('');

      const response = await subscribeVehicles({
        webhookId,
        assetDIDs,
        token: devJwt ?? '',
      });

      toast.success(
        response?.message ??
          t('webhooks.edit.subscribedCount', { count: assetDIDs.length }),
      );
      onSuccess?.();
      setIsOpen(false);
      setAssetDIDs([]);
    } catch (err) {
      captureException(err);
      console.error('Vehicle subscription error:', err);
      toast.error(t('webhooks.edit.subscribeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setAssetDIDs([]);
    setInputError('');
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <Title className={'text-panel-title'}>{t('webhooks.edit.addTitle')}</Title>
      <div className={'py-6'}>
        <AssetDIDsInput
          assetDIDs={assetDIDs}
          onChange={setAssetDIDs}
          label={t('webhooks.edit.addDidsLabel')}
          error={inputError}
          placeholder={t('webhooks.edit.addDidsPlaceholder')}
          disabled={loading}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={assetDIDs.length === 0 || loading}>
          {loading
            ? t('webhooks.edit.adding')
            : t('webhooks.edit.addCount', { count: assetDIDs.length })}
        </Button>
        <Button onClick={handleClose} variant="secondary">
          {t('actions.cancel')}
        </Button>
      </div>
    </Modal>
  );
};
