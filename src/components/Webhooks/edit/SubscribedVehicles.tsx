import { FC, useState } from 'react';
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
        <SectionHeader title={'Subscribed vehicles'}>
          <Title className={'text-xl'}>{data.length}</Title>
        </SectionHeader>
        <div className="flex gap-2 pb-4">
          <Button className="dark">Download CSV</Button>
          <Button className="dark" onClick={() => setIsAdding(true)}>
            Add vehicles
          </Button>
          <Button className="dark" onClick={() => setIsUnsubscribing(true)}>
            Unsubscribe vehicles
          </Button>
          <Button className="dark" onClick={() => setIsUnsubscribeAll(true)}>
            Unsubscribe all
          </Button>
        </div>
        <PaginatedTable data={data} columns={columns} />
      </Section>
    </div>
  );
};
