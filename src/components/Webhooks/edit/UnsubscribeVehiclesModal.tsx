import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { CSVUpload } from '@/components/CSVUpload';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';
import { unsubscribeByCsv } from '@/services/webhook';

export const UnsubscribeVehiclesModal: FC<SubscribeVehiclesActionModalProps> = ({
  isOpen,
  setIsOpen,
  webhookId,
  clientId,
  onSuccess,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [vehicleTokenIds, setVehicleTokenIds] = useState<string[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const devJwt = getDevJwt(clientId);
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async () => {
    if (!uploadedFile) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const response = await unsubscribeByCsv({
        webhookId,
        formData,
        token: devJwt ?? '',
      });
      setNotification(
        response?.message ?? 'Successfully unsubscribed vehicles',
        '',
        'success',
      );
      onSuccess?.();
      setIsOpen(false);
      setUploadedFile(null);
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
          onFileUpload={setUploadedFile}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={!uploadedFile || loading}>
          {loading ? 'Unsubscribing...' : 'Unsubscribe'}
        </Button>
        <Button onClick={() => setIsOpen(false)} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
