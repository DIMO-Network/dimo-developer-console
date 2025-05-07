import { FC, useContext, useState } from 'react';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';
import { Title } from '@/components/Title';
import { Section, SectionHeader } from '@/components/Section';
import { Loader } from '@/components/Loader';
import { ColumnDef } from '@tanstack/react-table';
import { PaginatedTable } from '@/components/Table';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { CSVUpload } from '@/components/CSVUpload';
import { subscribeVehicleIds } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { invalidateQuery } from '@/hooks/queries/useWebhookVehiclesById';

interface Props {
  webhookId: string;
  clientId: string;
}

const columns: ColumnDef<string>[] = [
  {
    header: 'Vehicle Token ID',
    accessorFn: (row) => row,
    cell: (info) => info.getValue(),
  },
];

export const SubscribedVehicles: FC<Props> = ({ webhookId, clientId }) => {
  const [isAdding, setIsAdding] = useState(false);
  const { data, isLoading, error } = useWebhookVehiclesById({ webhookId, clientId });
  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>Error fetching webhook</p>;
  }
  if (!data) {
    return <p>No webhook found</p>;
  }

  return (
    <div className={'flex flex-col gap-4'}>
      <AddVehiclesModal
        isOpen={isAdding}
        setIsOpen={setIsAdding}
        webhookId={webhookId}
        clientId={clientId}
        onSuccess={() => invalidateQuery({ webhookId, clientId })}
      />
      <Title className={'text-xl'}>Who do you want to subscribe?</Title>
      <Section>
        <SectionHeader title={'Subscribed vehicles'}>
          <Title className={'text-xl'}>{data.length}</Title>
        </SectionHeader>
        <div className="flex gap-2 pb-4">
          <Button className="dark">Download CSV</Button>
          <Button className="dark" onClick={() => setIsAdding(true)}>
            Add vehicles
          </Button>
          <Button className="dark">Unsubscribe vehicles</Button>
          <Button className="dark">Unsubscribe all</Button>
        </div>
        <PaginatedTable data={data} columns={columns} />
      </Section>
    </div>
  );
};

interface AddVehiclesModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  webhookId: string;
  clientId: string;
  onSuccess?: () => void;
}

const AddVehiclesModal: FC<AddVehiclesModalProps> = ({
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
      const failures = await subscribeVehicleIds(
        webhookId,
        vehicleTokenIds,
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
