import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { RightPanel } from '@/components/RightPanel';
import { CreditsWidget } from '@/components/CreditsWidget';

export const AppListRightPanel: FC = () => {
  return (
    <RightPanel>
      <CreditsWidget variant={'large'} />
      <WhatsDCX />
    </RightPanel>
  );
};

const WhatsDCX = () => {
  const t = useTranslations('app');
  return (
    <div className={'bg-control rounded-2xl p-4 w-full flex flex-col gap-2.5'}>
      <p className={'text-sm font-black'}>{t('list.dcx.title')}</p>
      <p className={'text-muted'}>{t('list.dcx.description')}</p>
      <a target="_blank" href={'https://dimo.org/pricing'} className={'underline'}>
        {t('list.dcx.learnMore')}
      </a>
    </div>
  );
};
