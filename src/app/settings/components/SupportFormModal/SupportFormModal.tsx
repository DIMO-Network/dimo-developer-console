import { type FC, useContext } from 'react';

import * as Sentry from '@sentry/nextjs';

import { DevSupportForm } from '@/components/DevSupportForm';
import { handleSupportRequest } from '@/app/settings/actions';
import { IDevSupportForm, ISupportRequest } from '@/types/support';

import { Modal } from '@/components/Modal';
import { NotificationContext } from '@/context/notificationContext';
import { Title } from '@/components/Title';

import './SupportFormModal.css';
import { useGlobalAccount } from '@/hooks';

interface SupportFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SupportFormModal: FC<SupportFormModalProps> = ({ isOpen, setIsOpen }) => {
  const { setNotification } = useContext(NotificationContext);
  const { currentUser } = useGlobalAccount();

  const handleSubmit = async (data: IDevSupportForm) => {
    const userEmail = currentUser?.email;
    const userName = currentUser?.email;
    const walletAddress = currentUser?.walletAddress;
    try {
      const supportRequest: ISupportRequest = {
        userEmail: userEmail!,
        userName: userName!,
        walletAddress: walletAddress!,
        ...data,
      };
      await handleSupportRequest(supportRequest);
      setIsOpen(false);
      setNotification(
        'Support request submitted successfully. We will be in touch soon.',
        'Success',
        'success',
      );
    } catch (error) {
      console.error('Failed to submit support request:', error);
      Sentry.captureException(error);
      setNotification('Failed to submit support request', 'Oops...', 'error');
    }
  };

  const onCancel = () => {
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="support-form-modal">
      <div className="support-form-content">
        <div className="support-form-header">
          <Title className="text-2xl" component="h3">
            Contact Developer Support
          </Title>
          <p className="description">
            Get in touch with our team to answer your questions.
          </p>
        </div>
        <DevSupportForm onSubmit={handleSubmit} onCancel={onCancel} />
      </div>
    </Modal>
  );
};
