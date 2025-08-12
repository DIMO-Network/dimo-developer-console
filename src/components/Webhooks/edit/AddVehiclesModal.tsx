import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { subscribeVehiclesList } from '@/services/webhook';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { VehicleTokenIdsInput } from '@/components/VehicleTokenIdsInput';
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
  const [vehicleTokenIds, setVehicleTokenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string>('');
  const devJwt = getDevJwt(clientId);
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async () => {
    if (vehicleTokenIds.length === 0) {
      setInputError('Please enter at least one vehicle token ID.');
      return;
    }

    try {
      setLoading(true);
      setInputError('');

      const response = await subscribeVehiclesList({
        webhookId,
        vehicleTokenIds,
        token: devJwt ?? '',
      });

      setNotification(
        response?.message ?? `Successfully subscribed ${vehicleTokenIds.length} vehicles`,
        '',
        'success',
      );
      onSuccess?.();
      setIsOpen(false);
      setVehicleTokenIds([]);
    } catch (err) {
      captureException(err);
      setNotification('Failed to subscribe vehicles. Please try again.', '', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setVehicleTokenIds([]);
    setInputError('');
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <Title>Add vehicles</Title>
      <div className={'py-6'}>
        <VehicleTokenIdsInput
          vehicleTokenIds={vehicleTokenIds}
          onChange={setVehicleTokenIds}
          label="Vehicle Token IDs to Subscribe"
          error={inputError}
          placeholder="Enter vehicle token IDs to subscribe to this webhook"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={vehicleTokenIds.length === 0 || loading}>
          {loading
            ? 'Adding...'
            : `Add ${vehicleTokenIds.length} Vehicle${vehicleTokenIds.length !== 1 ? 's' : ''}`}
        </Button>
        <Button onClick={handleClose} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
