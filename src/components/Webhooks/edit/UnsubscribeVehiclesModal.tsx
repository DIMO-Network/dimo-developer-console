import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { unsubscribeVehicleIds } from '@/services/webhook';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { CSVUpload } from '@/components/CSVUpload';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';

export const UnsubscribeVehiclesModal: FC<SubscribeVehiclesActionModalProps> = ({
  isOpen,
  setIsOpen,
  webhookId,
  clientId,
  onSuccess,
}) => {
  const [vehicleTokenIds, setVehicleTokenIds] = useState<string[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const devJwt = getDevJwt(clientId);
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const failures = await unsubscribeVehicleIds(
        webhookId,
        vehicleTokenIds,
        devJwt ?? '',
      );
      if (failures > 0) {
        setNotification(`${failures} vehicle(s) failed to unsubscribe.`, '', 'error');
      } else {
        setNotification('Successfully unsubscribed vehicles', '', 'success');
      }
      onSuccess?.();
      setIsOpen(false);
      setVehicleTokenIds([]);
      setFileInfo([]);
    } catch (err) {
      console.error(err);
      setNotification('Failed to unsubscribe vehicles. Please try again.', '', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <Title>Unsubscribe vehicles</Title>
      <div className={'py-6'}>
        <CSVUpload
          vehicleTokenIds={vehicleTokenIds}
          onChange={setVehicleTokenIds}
          fileInfo={fileInfo}
          onMetadataChange={setFileInfo}
          showTitle={false}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={!vehicleTokenIds.length || loading}>
          {loading ? 'Unsubscribing...' : 'Unsubscribe'}
        </Button>
        <Button onClick={() => setIsOpen(false)} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
