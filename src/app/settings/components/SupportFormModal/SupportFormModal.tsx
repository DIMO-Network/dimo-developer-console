import { FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Title } from '@/components/Title';

import './SupportFormModal.css';

interface SupportFormModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SupportFormModal: FC<SupportFormModalProps> = ({ isOpen, setIsOpen }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    // Simulate an async operation
    setTimeout(() => {
      setLoading(false);
      setIsOpen(false);
    }, 2000);
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
        <Button className="primary" onClick={handleSubmit} loading={loading}>
          Submit
        </Button>
      </div>
    </Modal>
  );
};
