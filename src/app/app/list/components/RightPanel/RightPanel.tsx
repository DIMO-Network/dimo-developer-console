import { FC } from 'react';

import './RightPanel.css';
import { CreditsWidget } from '@/components/CreditsWidget';

export const RightPanel: FC = () => {
  return (
    <div className={'right-panel-container'}>
      <CreditsWidget variant={'large'} />
      <WhatsDCX />
    </div>
  );
};

const WhatsDCX = () => {
  return (
    <div className={'bg-surface-raised rounded-2xl p-4 w-full flex flex-col gap-2.5'}>
      <p className={'text-sm font-black'}>What&#39;s DCX?</p>
      <p className={'text-text-secondary'}>
        DCX is an abbreviation for DIMO Credits. DIMO Credits cost $0.0001 per credit and
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
