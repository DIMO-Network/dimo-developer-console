'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getConfigurationsByClientId,
  deleteConfiguration,
  IConfigurationListItem,
} from '@/actions/configurations';
import { Button } from '@/components/Button';
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

  return (
    <div className="w-full overflow-x-auto rounded-card bg-card p-4">
      <table className="w-full table">
        <thead className="table-header">
          <tr className="text-left">
            <th className="py-2 pr-4 text-label text-muted font-medium">Name</th>
            <th className="py-2 pr-4 text-label text-muted font-medium">Component</th>
            <th className="py-2 text-label text-muted font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="table-body">
          {configs.map((config) => (
            <tr key={config.id} className="border-t border-outline">
              <td className="py-3 pr-4 text-body-sm text-fg">
                {config.configuration_name || '(untitled)'}
              </td>
              <td className="py-3 pr-4 text-body-sm text-fg">
                {entryStateLabel(config.entry_state)}
              </td>
              <td className="py-3">
                {pendingDeleteId === config.id ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void handleDelete(config.id)}
                    >
                      Confirm
                    </Button>
                    <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/license/${tokenId}/configurator/${config.id}`)
                      }
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
                    <Button
                      variant="secondary"
                      onClick={() => setPendingDeleteId(config.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
