import { FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';

import './DeleteConfirmationModal.css';

interface Props {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  loadingLabel?: string;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmButtonClassName?: string;
}

export const DeleteConfirmationModal: FC<Props> = ({
  isOpen,
  title,
  subtitle,
  loadingLabel,
  error,
  onConfirm,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } catch {
      // The caller reports its own failure through `error`.
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
        {!!subtitle && <p className={'text-muted'}>{subtitle}</p>}
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
          {isLoading && !!loadingLabel && (
            <p className={'text-center text-body-sm text-muted'}>{loadingLabel}</p>
          )}
          {!!error && (
            <p role="alert" className={'text-center text-body-sm text-negative'}>
              {error}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
