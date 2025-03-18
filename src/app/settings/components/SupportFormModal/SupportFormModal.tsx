import { type FC, useContext } from 'react';
import { useSession } from 'next-auth/react';

import * as Sentry from '@sentry/nextjs';

import { DevSupportForm } from '@/components/DevSupportForm';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';
import { handleSupportRequest } from '@/app/settings/actions';
import { IDevSupportForm, ISupportRequest } from '@/types/support';
import { IGlobalAccountSession } from '@/types/wallet';
import { Modal } from '@/components/Modal';
import { NotificationContext } from '@/context/notificationContext';
import { Title } from '@/components/Title';

import './SupportFormModal.css';

interface SupportFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SupportFormModal: FC<SupportFormModalProps> = ({ isOpen, setIsOpen }) => {
  const { data: session } = useSession();
  const { user: { name: userName, email: userEmail } = {} } = session ?? {};
  const { setNotification } = useContext(NotificationContext);

  const handleSubmit = async (data: IDevSupportForm) => {
    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const walletAddress = gaSession?.organization.smartContractAddress;
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
