import { FC } from 'react';

import {
  DevSupportForm,
  type IDevSupportForm,
} from '@/app/settings/components/DevSupportForm';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';

import './SupportFormModal.css';

interface SupportFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SupportFormModal: FC<SupportFormModalProps> = ({ isOpen, setIsOpen }) => {
  const handleSubmit = async (data: IDevSupportForm) => {
    console.log(data);
    // Simulate an async operation
    setTimeout(() => {
      setIsOpen(false);
    }, 2000);
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
