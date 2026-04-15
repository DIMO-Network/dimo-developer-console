'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getConfigurationsByClientId,
  deleteConfiguration,
  IConfigurationListItem,
} from '@/actions/configurations';
import { Button } from '@/components/Button';

interface Props {
  clientId: string;
  tokenId: number;
}

const entryStateLabel = (entryState: string): string => {
  switch (entryState) {
    case 'EMAIL_INPUT':
      return 'Login With DIMO';
    case 'VEHICLE_MANAGER':
      return 'Share Vehicles With DIMO';
    case 'ADVANCED_TRANSACTION':
      return 'Execute Advanced Transaction';
    default:
      return entryState;
  }
};

export const ConfigurationList = ({ clientId, tokenId }: Props) => {
  const router = useRouter();
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
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <p className="mb-4">No configurations yet.</p>
        <Button
          className="primary"
          onClick={() => router.push(`/license/${tokenId}/configurator/new`)}
        >
          Create your first configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-surface-default text-left text-text-secondary">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Component</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id} className="border-b border-surface-default">
              <td className="py-3 pr-4">{config.configuration_name || '(untitled)'}</td>
              <td className="py-3 pr-4 text-text-secondary">
                {entryStateLabel(config.entry_state)}
              </td>
              <td className="py-3">
                {pendingDeleteId === config.id ? (
                  <div className="flex gap-2">
                    <Button
                      className="table-action-button"
                      onClick={() => void handleDelete(config.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      className="table-action-button"
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      className="table-action-button"
                      onClick={() =>
                        router.push(`/license/${tokenId}/configurator/${config.id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      className="table-action-button"
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
