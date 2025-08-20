import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
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

    console.log('VEHICLE SUBSCRIPTION JWT TRACE');
    console.log('Component type: Client Component (uses getDevJwt)');
    console.log('Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
    console.log(
      'Domain:',
      typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    );
    console.log('Client ID for JWT:', clientId);
    console.log('JWT from getDevJwt available:', !!devJwt);
    console.log('--- End Vehicle Subscription JWT Trace ---');

    try {
      setLoading(true);
      setInputError('');

      const response = await subscribeVehicles({
        webhookId,
        assetDIDs,
        token: devJwt ?? '',
      });

      setNotification(
        response?.message ??
          `Successfully subscribed ${assetDIDs.length} vehicle${assetDIDs.length !== 1 ? 's' : ''}`,
        '',
        'success',
      );
      onSuccess?.();
      setIsOpen(false);
      setAssetDIDs([]);
    } catch (err) {
      captureException(err);
      console.error('Vehicle subscription error:', err);
      setNotification('Failed to subscribe vehicles. Please try again.', '', 'error');
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
      <Title>Add vehicles</Title>
      <div className={'py-6'}>
        <AssetDIDsInput
          assetDIDs={assetDIDs}
          onChange={setAssetDIDs}
          label="Asset DIDs to Subscribe"
          error={inputError}
          placeholder="Enter asset DIDs to subscribe to this webhook"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={assetDIDs.length === 0 || loading}>
          {loading
            ? 'Adding...'
            : `Add ${assetDIDs.length} Vehicle${assetDIDs.length !== 1 ? 's' : ''}`}
        </Button>
        <Button onClick={handleClose} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
