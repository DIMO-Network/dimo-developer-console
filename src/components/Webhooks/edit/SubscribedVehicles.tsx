import { FC } from 'react';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';
import { Title } from '@/components/Title';
import { Section, SectionHeader } from '@/components/Section';
import { Loader } from '@/components/Loader';
import { ColumnDef } from '@tanstack/react-table';
import { PaginatedTable } from '@/components/Table';

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
      <Title className={'text-xl'}>Who do you want to subscribe?</Title>
      <Section>
        <SectionHeader title={'Subscribed vehicles'}>
          <Title className={'text-xl'}>{data.length}</Title>
        </SectionHeader>
        <PaginatedTable data={data} columns={columns} />
      </Section>
    </div>
  );
};
