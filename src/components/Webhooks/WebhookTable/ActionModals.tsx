import { useWebhookTableContext } from '@/components/Webhooks/providers/WebhookTableContextProvider';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import React from 'react';
import { TestWebhookModal } from '@/components/Webhooks/components/TestWebhookModal';
import { DeleteWebhookModal } from '@/components/Webhooks/components/DeleteWebhookModal';

export const ActionModals = ({ clientId }: { clientId: string }) => {
  const {
    expandedWebhook,
    isTestOpen,
    setIsTestOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    resetExpandedWebhookId,
  } = useWebhookTableContext();

  const onDeleteSuccess = () => {
    setIsDeleteOpen(false);
    resetExpandedWebhookId();
    invalidateQuery(clientId);
  };

  if (!expandedWebhook) {
    return null;
  }

  return (
    <React.Fragment>
      <TestWebhookModal
        webhook={expandedWebhook}
        isOpen={isTestOpen}
        setIsOpen={setIsTestOpen}
      />
      <DeleteWebhookModal
        webhook={expandedWebhook}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        onSuccess={onDeleteSuccess}
        clientId={clientId}
      />
    </React.Fragment>
  );
};
