import { useTranslations } from 'next-intl';
import { FC, useMemo, useState } from 'react';
import {
  invalidateQuery,
  useWebhookVehiclesById,
} from '@/hooks/queries/useWebhookVehiclesById';
import { Title } from '@/components/Title';
import { Section, SectionHeader } from '@/components/Section';
import { Loader } from '@/components/Loader';
import { LegacyColumnDef } from '@tanstack/react-table/legacy';
import { PaginatedTable } from '@/components/Table';
import { Button } from '@/components/Button';
import { AddVehiclesModal } from '@/components/Webhooks/edit/AddVehiclesModal';
import { UnsubscribeVehiclesModal } from '@/components/Webhooks/edit/UnsubscribeVehiclesModal';
import { UnsubscribeAllModal } from '@/components/Webhooks/edit/UnsubscribeAllModal';
import { subscribeAllVehicles } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import { toast } from 'sonner';
import { CSV_UPLOAD_ROW_TITLE } from '@/components/CSVUpload';
import { saveAs } from 'file-saver';
import { captureException } from '@sentry/nextjs';

interface Props {
  webhookId: string;
  clientId: string;
}

// Table rows must be objects, so each token ID is wrapped.
type VehicleRow = { tokenId: string };

export const SubscribedVehicles: FC<Props> = ({ webhookId, clientId }) => {
  const t = useTranslations('common');
  const [isAdding, setIsAdding] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isUnsubscribeAll, setIsUnsubscribeAll] = useState(false);
  const [subscribingAll, setSubscribingAll] = useState(false);
  const { data, isLoading, error } = useWebhookVehiclesById({ webhookId, clientId });
  // A new rows array on every render would send the table back to page 1.
  const rows = useMemo(() => (data ?? []).map((tokenId) => ({ tokenId })), [data]);
  const columns = useMemo<LegacyColumnDef<VehicleRow>[]>(
    () => [
      {
        header: t('webhooks.edit.vehicleTokenId'),
        accessorFn: (row) => row.tokenId,
        cell: (info) => info.getValue(),
      },
    ],
    [t],
  );
  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>{t('webhooks.edit.fetchWebhookError')}</p>;
  }
  if (!data) {
    return <p>{t('webhooks.edit.notFound')}</p>;
  }

  const subscribeAll = async () => {
    try {
      setSubscribingAll(true);
      const response = await subscribeAllVehicles(webhookId, getDevJwt(clientId) ?? '');
      toast.success(response?.message ?? t('webhooks.edit.subscribedAll'));
      invalidateQuery({ webhookId, clientId });
    } catch (err) {
      captureException(err);
      toast.error(t('webhooks.edit.subscribeAllFailed'));
    } finally {
      setSubscribingAll(false);
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
      <Title className={'text-card-title'}>{t('webhooks.edit.whoToSubscribe')}</Title>
      <Section>
        <SectionHeader title={t('webhooks.edit.manualControls')} />
        <p className={'text-body-sm text-muted'}>
          {t('webhooks.edit.manualControlsHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={subscribeAll} disabled={subscribingAll}>
            {subscribingAll
              ? t('webhooks.edit.subscribing')
              : t('webhooks.edit.subscribeAll')}
          </Button>
          <Button variant="secondary" onClick={() => setIsUnsubscribeAll(true)}>
            {t('webhooks.edit.unsubscribeAll')}
          </Button>
        </div>
      </Section>
      <Section>
        <SectionHeader title={t('webhooks.edit.subscribedVehicles')}>
          <Title className={'text-card-title'}>{data.length}</Title>
        </SectionHeader>
        <div className="flex flex-wrap gap-2 pb-4">
          <Button variant="secondary" onClick={downloadCsv}>
            {t('webhooks.edit.downloadCsv')}
          </Button>
          <Button variant="secondary" onClick={() => setIsAdding(true)}>
            {t('webhooks.edit.addTitle')}
          </Button>
          <Button variant="secondary" onClick={() => setIsUnsubscribing(true)}>
            {t('webhooks.edit.unsubscribeVehicles')}
          </Button>
        </div>
        <div className="-mx-4 -mb-4">
          <PaginatedTable data={rows} columns={columns} />
        </div>
      </Section>
    </div>
  );
};
