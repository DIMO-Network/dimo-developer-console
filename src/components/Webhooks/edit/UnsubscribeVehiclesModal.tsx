import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { AssetDIDsInput } from '@/components/AssetDIDsInput';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';
import { unsubscribeVehicles } from '@/services/webhook';
import { captureException } from '@sentry/nextjs';

export const UnsubscribeVehiclesModal: FC<SubscribeVehiclesActionModalProps> = ({
  isOpen,
  setIsOpen,
  webhookId,
  clientId,
  onSuccess,
}) => {
  const [assetDIDs, setAssetDIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string>('');
  const devJwt = getDevJwt(clientId);
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async () => {
    if (assetDIDs.length === 0) {
      setInputError('Please enter at least one asset DID.');
      return;
    }

    try {
      setLoading(true);
      setInputError('');

      const response = await unsubscribeVehicles({
        webhookId,
        assetDIDs,
        token: devJwt ?? '',
      });

      setNotification(
        response?.message ??
          `Successfully unsubscribed ${assetDIDs.length} vehicle${assetDIDs.length !== 1 ? 's' : ''}`,
        '',
        'success',
      );
      onSuccess?.();
      setIsOpen(false);
      setAssetDIDs([]);
    } catch (err) {
      captureException(err);
      console.error('Vehicle unsubscription error:', err);
      setNotification('Failed to unsubscribe vehicles. Please try again.', '', 'error');
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
      <Title>Remove vehicles</Title>
      <div className={'py-6'}>
        <AssetDIDsInput
          assetDIDs={assetDIDs}
          onChange={setAssetDIDs}
          label="Asset DIDs to Unsubscribe"
          error={inputError}
          placeholder="Enter asset DIDs to unsubscribe from this webhook"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={assetDIDs.length === 0 || loading}>
          {loading
            ? 'Removing...'
            : `Remove ${assetDIDs.length} Vehicle${assetDIDs.length !== 1 ? 's' : ''}`}
        </Button>
        <Button onClick={handleClose} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
