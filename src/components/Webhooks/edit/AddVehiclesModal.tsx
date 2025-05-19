import { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { subscribeByCsv } from '@/services/webhook';
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const devJwt = getDevJwt(clientId);
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async () => {
    if (!uploadedFile) {
      setNotification('No file uploaded.', '', 'error');
      return;
    }
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('file', uploadedFile);
      const response = await subscribeByCsv({
        webhookId,
        formData,
        token: devJwt ?? '',
      });
      setNotification(
        response?.message ?? 'Successfully subscribed vehicles',
        '',
        'success',
      );
      onSuccess?.();
      setIsOpen(false);
      setVehicleTokenIds([]);
      setFileInfo([]);
      setUploadedFile(null);
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
          onFileUpload={setUploadedFile}
        />
      </div>
      <div className="flex flex-col w-full gap-4 pt-4">
        <Button onClick={handleSubmit} disabled={!uploadedFile || loading}>
          {loading ? 'Adding...' : 'Add'}
        </Button>
        <Button onClick={() => setIsOpen(false)} className="dark">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
