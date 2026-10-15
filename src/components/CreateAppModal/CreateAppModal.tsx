import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { FC } from 'react';
import { Form } from '@/app/app/create/components/Form';

import './CreateAppModal.css';

interface Props {
  isOpen: boolean;
  handleIsOpen: (e: boolean) => void;
}
export const CreateAppModal: FC<Props> = ({ isOpen, handleIsOpen }) => {
  const handleClose = () => {
    handleIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={handleIsOpen} className="create-app-modal">
      <div className="create-app-content">
        <div className="create-app-header">
          <Title className="text-panel-title" component="h3">
            Create a new developer license
          </Title>
        </div>
        <div className={'flex w-full flex-1 pt-6'}>
          <Form onSuccess={handleClose} onClose={handleClose} />
        </div>
      </div>
    </Modal>
  );
};
export default CreateAppModal;
