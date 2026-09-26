import { FC } from 'react';
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
  return (
    <div className={'flex w-full flex-col gap-2.5 rounded-card bg-card p-4'}>
      <p className={'text-card-title text-ink'}>What&#39;s DCX?</p>
      <p className={'text-body-sm text-muted'}>
        DCX is an abbreviation for DIMO Credits. DIMO Credits cost $0.001 per credit and
        API calls and other DIMO fees are priced in DCX.
      </p>
      <a
        target="_blank"
        href={'https://docs.dimo.org/developer-platform/developer-guide/dimo-credits'}
        className={'text-body-sm text-accent-ink underline'}
      >
        Learn more.
      </a>
    </div>
  );
};
