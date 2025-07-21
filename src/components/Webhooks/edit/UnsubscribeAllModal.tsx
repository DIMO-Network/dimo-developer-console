import React, { FC, useContext, useState } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import { NotificationContext } from '@/context/notificationContext';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { SubscribeVehiclesActionModalProps } from '@/components/Webhooks/edit/types';
import { unsubscribeAllVehicles } from '@/services/webhook';
import { captureException } from '@sentry/nextjs';

export const UnsubscribeAllModal: FC<SubscribeVehiclesActionModalProps> = ({
  isOpen,
  setIsOpen,
  webhookId,
  clientId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const devJwt = getDevJwt(clientId);
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await unsubscribeAllVehicles({ webhookId, token: devJwt ?? '' });
      setNotification('Successfully unsubscribed all vehicles.', '', 'success');
      onSuccess?.();
      setIsOpen(false);
    } catch (err) {
      captureException(err);
      setNotification('An error occurred while unsubscribing all vehicles.', '', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="flex w-full flex-col gap-12">
        <Title>Unsubscribe all vehicles</Title>
        <div className="flex flex-col gap-4">
          <p>
            Are you sure you want to unsubscribe all the subscribed vehicles? This action
            cannot be undone.
          </p>
        </div>
        <div className="flex flex-col w-full gap-4 pt-4">
          <Button onClick={handleSubmit} className="error" disabled={loading}>
            {loading ? 'Unsubscribing...' : 'Unsubscribe all'}
          </Button>
          <Button onClick={() => setIsOpen(false)} className="primary-outline">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
