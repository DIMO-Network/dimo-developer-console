'use client';
import { type FC } from 'react';

import { Loader } from '@//components/Loader';
import { Banner } from '@/app/app/list/components/Banner';
import { useOnboarding, useUser } from '@/hooks';
import Image from 'next/image';
import { LicenseList } from '@/app/license/list';
import './View.css';

export const View: FC = () => {
  const { isLoading, apps, balance, workspace } = useOnboarding();
  const { user } = useUser();

  if (isLoading) {
    return <Loader isLoading={true} />;
  }

  return (
    <div className="app-list-page">
      <div className="welcome-message">
        <Image
          src={'/images/waving_hand.svg'}
          width={16}
          height={16}
          alt={'waving-hand'}
        />
        <p className="title">Welcome, {user?.name.slice(0, user.name?.indexOf(' '))}</p>
      </div>
      {!(balance && apps.length) && <Banner balance={balance} apps={apps} />}
      <LicenseList workspace={workspace} />
    </div>
  );
};

export default View;
