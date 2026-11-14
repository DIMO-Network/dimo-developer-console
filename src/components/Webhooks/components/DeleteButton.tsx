import { useTranslations } from 'next-intl';
import React from 'react';
import Button from '@/components/Button/Button';

export const DeleteButton = ({ onDelete }: { onDelete: () => void }) => {
  const t = useTranslations('common');
  return (
    <Button variant="secondary" onClick={onDelete}>
      {t('webhooks.delete.button')}
    </Button>
  );
};
