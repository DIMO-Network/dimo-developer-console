'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getConfigurationsByClientId,
  deleteConfiguration,
  IConfigurationListItem,
} from '@/actions/configurations';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { NotificationContext } from '@/context/notificationContext';

const DIMO_LOGIN_BASE =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
    ? 'https://login.dimo.org'
    : 'https://login.dev.dimo.org';

interface Props {
  clientId: string;
  tokenId: number;
}

const entryStateLabel = (entryState: string): string => {
  switch (entryState) {
    case 'EMAIL_INPUT':
      return 'Login with DIMO';
    case 'VEHICLE_MANAGER':
      return 'Share vehicles with DIMO';
    case 'ADVANCED_TRANSACTION':
      return 'Execute advanced transaction';
    default:
      return entryState;
  }
};

export const ConfigurationList = ({ clientId, tokenId }: Props) => {
  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);
  const [configs, setConfigs] = useState<IConfigurationListItem[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = async () => {
    const data = await getConfigurationsByClientId({ client_id: clientId });
    setConfigs(data);
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  const handleDelete = async (id: string) => {
    await deleteConfiguration({ id });
    setPendingDeleteId(null);
    await load();
  };

  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <p className="mb-4">No configurations yet.</p>
        <Button onClick={() => router.push(`/license/${tokenId}/configurator/new`)}>
          Create your first configuration
        </Button>
      </div>
    );
  }

  // The actions column re-renders with pendingDeleteId, so the inline delete
  // confirm swaps in per row. break-normal/nowrap undo the cell's break-all so
  // a squeezed row scrolls instead of breaking button labels mid-word.
  const renderActions = (config: IConfigurationListItem) => (
    <div className="flex gap-2 whitespace-nowrap break-normal">
      {pendingDeleteId === config.id ? (
        <>
          <Button variant="destructive" onClick={() => void handleDelete(config.id)}>
            Confirm
          </Button>
          <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={() => router.push(`/license/${tokenId}/configurator/${config.id}`)}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const url = `${DIMO_LOGIN_BASE}/?configurationId=${config.id}`;
              navigator.clipboard.writeText(url);
              setNotification('Sharing link copied', '', 'success');
            }}
          >
            Copy link
          </Button>
          <Button variant="secondary" onClick={() => setPendingDeleteId(config.id)}>
            Delete
          </Button>
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
            label: 'Name',
            name: 'configuration_name',
            className: 'pr-4',
            render: (config: IConfigurationListItem) => (
              <span className="break-normal">
                {config.configuration_name || '(untitled)'}
              </span>
            ),
          },
          {
            label: 'Component',
            name: 'entry_state',
            className: 'pr-4',
            render: (config: IConfigurationListItem) => (
              <span className="break-normal">{entryStateLabel(config.entry_state)}</span>
            ),
          },
          { label: 'Actions', name: 'id', render: renderActions },
        ]}
        data={configs}
      />
    </div>
  );
};
