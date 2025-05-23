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
    <div className={'bg-surface-raised rounded-2xl p-4 w-full flex flex-col gap-2.5'}>
      <p className={'text-sm font-black'}>What&#39;s DCX?</p>
      <p className={'text-text-secondary'}>
        DCX is an abbreviation for DIMO Credits. DIMO Credits cost $0.001 per credit and
        API calls and other DIMO fees are priced in DCX.
      </p>
      <a
        target="_blank"
        href={'https://docs.dimo.org/developer-platform/developer-guide/dimo-credits'}
        className={'underline'}
      >
        Learn more.
      </a>
    </div>
  );
};
