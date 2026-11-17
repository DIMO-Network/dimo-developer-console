import { useTranslations } from 'next-intl';
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
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } catch (error: unknown) {
      // The caller reports its own failure through `error`. Logged so a caller that
      // forgets to isn't silent; only the name, since a message can carry anything.
      console.error(
        'Delete confirmation failed:',
        error instanceof Error ? error.name : typeof error,
      );
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
            {t('actions.confirm')}
          </Button>
          <Button
            variant="secondary"
            className={'w-full'}
            disabled={isLoading}
            onClick={onCancel}
          >
            {t('actions.cancel')}
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
