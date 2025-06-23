import { Webhook } from '@/types/webhook';
import { useHasSubscribedVehicles } from '@/components/Webhooks/hooks/useHasSubscribedVehicles';
import { useWebhookTableContext } from '@/components/Webhooks/WebhookTable';
import React, { useContext } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import Button from '@/components/Button/Button';

export const DeleteButton = ({
  webhook,
  clientId,
}: {
  webhook: Webhook;
  clientId: string;
}) => {
  const hasSubscribedVehicles = useHasSubscribedVehicles(webhook, clientId);
  const { setIsDeleteOpen } = useWebhookTableContext();
  const { setNotification } = useContext(NotificationContext);

  const handleDelete = () => {
    if (hasSubscribedVehicles) {
      return setNotification(
        'Please unsubscribe all vehicles before deleting the webhook',
        '',
        'error',
      );
    }
    setIsDeleteOpen(true);
  };

  return (
    <Button className="primary-outline" onClick={handleDelete}>
      Delete
    </Button>
  );
};
