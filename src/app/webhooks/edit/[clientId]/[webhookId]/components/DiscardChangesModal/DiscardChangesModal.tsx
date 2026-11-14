import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import React, { FC } from 'react';
import { Button } from '@/components/Button';
import { useTranslations } from 'next-intl';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DiscardChangesModal: FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const t = useTranslations('webhooks');
  const tCommon = useTranslations('common');
  return (
    <Modal isOpen={isOpen} setIsOpen={onClose}>
      <div className="flex w-full flex-col gap-12">
        <Title className={'text-panel-title'}>{t('discardChanges.title')}</Title>
        <div className="flex flex-col gap-4">
          <p>{t('discardChanges.message')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Button onClick={onConfirm} variant="destructive">
            {tCommon('actions.confirm')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
