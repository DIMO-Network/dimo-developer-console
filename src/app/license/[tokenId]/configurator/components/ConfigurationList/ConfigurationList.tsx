'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { deleteConfiguration, IConfigurationListItem } from '@/actions/configurations';
import { fetchJson } from '@/utils/fetchJson';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { toast } from 'sonner';
import { OwnerAction } from '@/components/OwnerOnly';
import { configurationLink } from '@/app/license/[tokenId]/configurator/utils/configuration';

interface Props {
  clientId: string;
  tokenId: number;
  /** The license's on-chain owner: the only team owner who may change it. */
  owner?: string;
}

const ENTRY_STATE_COMPONENTS: Record<string, string> = {
  EMAIL_INPUT: 'LoginWithDimo',
  VEHICLE_MANAGER: 'ShareVehiclesWithDimo',
  ADVANCED_TRANSACTION: 'ExecuteAdvancedTransactionWithDimo',
};

export const ConfigurationList = ({ clientId, tokenId, owner }: Props) => {
  const t = useTranslations('configurator');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Same key as the license cards, so the two share one cached list.
  const {
    data: configs,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['configurations', clientId],
    queryFn: () =>
      fetchJson<IConfigurationListItem[]>(
        `/api/configurations?clientId=${encodeURIComponent(clientId)}`,
      ),
  });

  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  const handleDelete = async (id: string) => {
    try {
      await deleteConfiguration({ id });
    } catch (error) {
      Sentry.captureException(error);
      toast.error(t('table.deleteFailed'));
      return;
    }
    setPendingDeleteId(null);
    await refetch();
  };

  if (isError) {
    return (
      <p role="alert" className="py-12 text-center text-body-sm text-negative">
        {t('table.loadError')}
      </p>
    );
  }

  if (isPending) {
    return (
      <p className="py-12 text-center text-body-sm text-muted">{t('table.loading')}</p>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <p className="mb-4">{t('table.empty')}</p>
        <OwnerAction licenseOwner={owner}>
          <Button onClick={() => router.push(`/license/${tokenId}/configurator/new`)}>
            {t('table.createFirst')}
          </Button>
        </OwnerAction>
      </div>
    );
  }

  const entryStateLabel = (entryState: string): string => {
    const component = ENTRY_STATE_COMPONENTS[entryState];
    return component ? t(`components.${component}`) : entryState;
  };

  // The actions column re-renders with pendingDeleteId, so the inline delete
  // confirm swaps in per row. break-normal/nowrap undo the cell's break-all so
  // a squeezed row scrolls instead of breaking button labels mid-word.
  const renderActions = (config: IConfigurationListItem) => (
    <div className="flex flex-wrap gap-2 break-normal">
      {pendingDeleteId === config.id ? (
        <>
          <Button variant="destructive" onClick={() => void handleDelete(config.id)}>
            {tCommon('actions.confirm')}
          </Button>
          <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
            {tCommon('actions.cancel')}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={() => router.push(`/license/${tokenId}/configurator/${config.id}`)}
          >
            {tCommon('actions.edit')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const url = configurationLink(config.id);
              navigator.clipboard.writeText(url);
              toast.success(t('table.linkCopied'));
            }}
          >
            {t('table.copyLink')}
          </Button>
          <OwnerAction licenseOwner={owner}>
            <Button
              variant="destructive-ghost"
              onClick={() => setPendingDeleteId(config.id)}
            >
              {tCommon('actions.delete')}
            </Button>
          </OwnerAction>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full overflow-x-auto">
      <Table
        // The shared cell breaks anywhere (break-all, for long ids); names and
        // component labels wrap at words, with a gutter before the next column.
        columns={[
          {
            label: t('table.name'),
            name: 'configuration_name',
            className: 'pr-4',
            render: (config: IConfigurationListItem) => (
              <span className="break-normal">
                {config.configuration_name || t('table.untitled')}
              </span>
            ),
          },
          {
            label: t('table.component'),
            name: 'entry_state',
            className: 'pr-4 text-muted',
            render: (config: IConfigurationListItem) => (
              <span className="break-normal">{entryStateLabel(config.entry_state)}</span>
            ),
          },
          { label: t('table.actions'), name: 'id', render: renderActions },
        ]}
        data={configs}
      />
    </div>
  );
};
