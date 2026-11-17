import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Button from '@/components/Button/Button';
import React from 'react';

export const EditButton = ({ editUrl }: { editUrl: string }) => {
  const t = useTranslations('common');
  return (
    <Link href={editUrl}>
      <Button variant="secondary">{t('webhooks.edit.button')}</Button>
    </Link>
  );
};
