import { FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';

import './DeleteConfirmationModal.css';

interface Props {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmButtonClassName?: string;
}

export const DeleteConfirmationModal: FC<Props> = ({
  isOpen,
  title,
  subtitle,
  onConfirm,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={isLoading ? () => {} : onCancel}
      showClose={!isLoading}
      className={'confirmation-modal'}
    >
      <div className={'flex flex-col gap-4'}>
        <Title component={'h2'} className={'text-panel-title text-ink'}>
          {title}
        </Title>
        {!!subtitle && <p className={'text-text-secondary'}>{subtitle}</p>}
        <div className={'mt-4 flex flex-col flex-1 gap-4'}>
          <Button
            variant="destructive"
            className={'w-full'}
            loading={isLoading}
            onClick={handleConfirm}
          >
            Confirm
          </Button>
          <Button
            variant="secondary"
            className={'w-full'}
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
