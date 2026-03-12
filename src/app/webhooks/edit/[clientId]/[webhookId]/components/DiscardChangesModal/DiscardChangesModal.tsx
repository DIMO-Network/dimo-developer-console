import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import React, { FC } from 'react';
import { Button } from '@/components/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DiscardChangesModal: FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} setIsOpen={onClose}>
      <div className="flex w-full flex-col gap-12">
        <Title>Discard changes</Title>
        <div className="flex flex-col gap-4">
          <p>
            Are you sure you want to discard your changes? This action cannot be undone.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Button onClick={onConfirm} className="error">
            Confirm
          </Button>
          <Button className="primary-outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
