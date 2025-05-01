import { Webhook } from '@/types/webhook';
import { Toggle } from '@/components/Toggle';
import Button from '@/components/Button/Button';
import React from 'react';

import '../Webhooks.css';

export const ExpandedRow = ({
  webhook,
  onTest,
  onEdit,
  onDelete,
}: {
  webhook: Webhook;
  clientId: string;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <tr className="expanded-row bg-surface-sunken border-t-0">
      <td colSpan={5} className={'px-4 pb-4 pt-3 cell-bottom-border'}>
        <div className="expanded-content space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-text-secondary">
              Webhook URL
            </label>
            <input
              type="text"
              value={webhook.target_uri}
              readOnly
              className="w-full rounded-md bg-cta-default px-3 py-2 text-sm text-text-secondary"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status</span>
              <Toggle
                checked={webhook.status === 'Active'}
                onToggle={() => {
                  /* TODO - implement editing a webhook's status */
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button className="primary-outline" onClick={onTest}>
                Test
              </Button>
              <Button className="primary-outline" onClick={onEdit}>
                Edit
              </Button>
              <Button className="primary-outline" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};
