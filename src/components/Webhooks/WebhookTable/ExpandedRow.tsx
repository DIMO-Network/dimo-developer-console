import { Webhook } from '@/types/webhook';
import { Toggle } from '@/components/Toggle';
import Button from '@/components/Button/Button';
import React, { useState } from 'react';

import '../Webhooks.css';
import { TestWebhookModal } from '@/components/Webhooks/components/TestWebhookModal';
import { DeleteWebhookModal } from '@/components/Webhooks/components/DeleteWebhookModal';

export const ExpandedRow = ({ webhook }: { webhook: Webhook }) => {
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const onEdit = () => {};

  return (
    <>
      <TestWebhookModal webhook={webhook} isOpen={isTestOpen} setIsOpen={setIsTestOpen} />
      <DeleteWebhookModal
        webhook={webhook}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
      />
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
                <Button className="primary-outline" onClick={() => setIsTestOpen(true)}>
                  Test
                </Button>
                <Button
                  className="primary-outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  Edit
                </Button>
                <Button className="primary-outline" onClick={() => setIsDeleteOpen(true)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};
