import { FC, useContext, useState } from 'react';
import {
  invalidateQuery,
  useWebhookVehiclesById,
} from '@/hooks/queries/useWebhookVehiclesById';
import { Title } from '@/components/Title';
import { Section, SectionHeader } from '@/components/Section';
import { Loader } from '@/components/Loader';
import { ColumnDef } from '@tanstack/react-table';
import { PaginatedTable } from '@/components/Table';
import { Button } from '@/components/Button';
import { AddVehiclesModal } from '@/components/Webhooks/edit/AddVehiclesModal';
import { UnsubscribeVehiclesModal } from '@/components/Webhooks/edit/UnsubscribeVehiclesModal';
import { UnsubscribeAllModal } from '@/components/Webhooks/edit/UnsubscribeAllModal';
import { subscribeAllVehicles, unsubscribeAllVehicles } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { CSV_UPLOAD_ROW_TITLE } from '@/components/CSVUpload';
import { saveAs } from 'file-saver';

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
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isUnsubscribeAll, setIsUnsubscribeAll] = useState(false);
  const [unsubscribingAll, setUnsubscribingAll] = useState(false);
  const [subscribingAll, setSubscribingAll] = useState(false);
  const { setNotification } = useContext(NotificationContext);

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

  const subscribeAll = async () => {
    try {
      setSubscribingAll(true);
      const response = await subscribeAllVehicles(webhookId, getDevJwt(clientId) ?? '');
      setNotification(
        response?.message ?? 'Successfully subscribed all vehicles',
        '',
        'success',
      );
      invalidateQuery({ webhookId, clientId });
    } catch (err) {
      console.error(err);
      setNotification('Failed to subscribe all vehicles', '', 'error');
    } finally {
      setSubscribingAll(false);
    }
  };

  const unsubscribeAll = async () => {
    try {
      setUnsubscribingAll(true);
      await unsubscribeAllVehicles({ webhookId, token: getDevJwt(clientId) ?? '' });
      setNotification('Successfully unsubscribed all vehicles', '', 'success');
      invalidateQuery({ webhookId, clientId });
    } catch (err) {
      console.error(err);
      setNotification('Failed to unsubscribe all vehicles', '', 'error');
    } finally {
      setUnsubscribingAll(false);
    }
  };

  const downloadCsv = () => {
    if (!data.length) return;

    const csvContent = [CSV_UPLOAD_ROW_TITLE, ...data].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'subscribed-vehicles.csv');
  };

  return (
    <div className={'flex flex-col gap-4'}>
      <AddVehiclesModal
        isOpen={isAdding}
        setIsOpen={setIsAdding}
        webhookId={webhookId}
        clientId={clientId}
        onSuccess={() => invalidateQuery({ webhookId, clientId })}
      />
      <UnsubscribeVehiclesModal
        isOpen={isUnsubscribing}
        setIsOpen={setIsUnsubscribing}
        webhookId={webhookId}
        clientId={clientId}
        onSuccess={() => invalidateQuery({ webhookId, clientId })}
      />
      <UnsubscribeAllModal
        isOpen={isUnsubscribeAll}
        setIsOpen={setIsUnsubscribeAll}
        webhookId={webhookId}
        clientId={clientId}
        onSuccess={() => invalidateQuery({ webhookId, clientId })}
      />
      <Title className={'text-xl'}>Who do you want to subscribe?</Title>
      <Section>
        <SectionHeader title="Manual controls" />
        <p className={'text-text-secondary'}>
          Manually subscribe or unsubscribe all vehicles linked to this webhook.
        </p>
        <div className="flex gap-2">
          <Button className="dark" onClick={subscribeAll} disabled={subscribingAll}>
            {subscribingAll ? 'Subscribing...' : 'Subscribe all vehicles'}
          </Button>
          <Button className="dark" onClick={unsubscribeAll} disabled={unsubscribingAll}>
            {unsubscribingAll ? 'Unsubscribing...' : 'Unsubscribe all vehicles'}
          </Button>
        </div>
      </Section>
      <Section>
        <SectionHeader title={'Subscribed vehicles'}>
          <Title className={'text-xl'}>{data.length}</Title>
        </SectionHeader>
        <div className="flex gap-2 pb-4">
          <Button className="dark" onClick={downloadCsv}>
            Download CSV
          </Button>
          <Button className="dark" onClick={() => setIsAdding(true)}>
            Add vehicles
          </Button>
          <Button className="dark" onClick={() => setIsUnsubscribing(true)}>
            Unsubscribe vehicles
          </Button>
        </div>
        <PaginatedTable data={data} columns={columns} />
      </Section>
    </div>
  );
};
