'use client';
import { type FC } from 'react';

import { Loader } from '@//components/Loader';
import { AppList } from '@/app/app/list/components/AppList';
import { Banner } from '@/app/app/list/components/Banner';
import { useOnboarding } from '@/hooks';
import { Explanation } from '@/app/app/list/components/DCXExplanation';
import { GetStarted } from '@/app/app/list/components/GetStarted';

import './View.css';

export const View: FC = () => {
  const { isLoading, apps, balance, cta } = useOnboarding();

  return (
    <>
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <div className="app-list-page">
          <div className="welcome-message">
            <p className="title">Welcome to DIMO Developer Console</p>
          </div>
          <Banner cta={cta} />
          {balance === 0 && apps.length === 0 && <Explanation />}
          {apps.length === 0 && (
            <GetStarted hasBalance={balance > 0} hasApps={apps.length > 0} />
          )}
          {apps.length > 0 && <AppList apps={apps} />}
        </div>
      )}
    </>
  );
};

export default View;
