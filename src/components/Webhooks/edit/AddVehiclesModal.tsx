import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';
import { subscribeVehicleIds } from '@/services/webhook';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { CSVUpload } from '@/components/CSVUpload';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';

export const AddVehiclesModal: FC<SubscribeVehiclesActionModalProps> = ({
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
  const { data: existingVehicles } = useWebhookVehiclesById({ webhookId, clientId });

  const handleSubmit = async () => {
    const newVehicleTokenIds = [...new Set(vehicleTokenIds)].filter(
      (id) => !existingVehicles?.includes(id),
    );
    try {
      setLoading(true);
      const failures = await subscribeVehicleIds(
        webhookId,
        newVehicleTokenIds,
        devJwt ?? '',
      );
      if (failures > 0) {
        setNotification(`${failures} vehicle(s) failed to subscribe.`, '', 'error');
      } else {
        setNotification('Successfully subscribed vehicles', '', 'success');
      }
      onSuccess?.();
      setIsOpen(false);
      setVehicleTokenIds([]);
      setFileInfo([]);
    } catch (err) {
      console.error(err);
      setNotification('Failed to subscribe vehicles. Please try again.', '', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <Title>Add vehicles</Title>
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
          {loading ? 'Adding...' : 'Add'}
        </Button>
        <Button onClick={() => setIsOpen(false)} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
