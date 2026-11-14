import React from 'react';
import { useTranslations } from 'next-intl';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';

const EmptyList: React.FC = () => {
  const t = useTranslations('app');
  return (
    <div
      className={
        'flex w-full flex-1 flex-col items-center justify-center rounded-card bg-card p-10 text-center'
      }
    >
      <p className={'text-card-title text-ink'}>{t('list.empty.title')}</p>
      <p className={'mb-5 mt-1 text-body-sm text-muted'}>{t('list.empty.description')}</p>
      <CreateAppButton />
    </div>
  );
};
export default EmptyList;
