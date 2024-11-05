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
  const { isLoading, apps, balanceDCX, cta } = useOnboarding();

  return (
    <>
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <div className="app-list-page">
          <div className="welcome-message">
            <p className="title">Welcome to DIMO Developer Consoleh</p>
          </div>
          <Banner cta={cta} />
          {balanceDCX === 0 && <Explanation />}
          {apps.length === 0 && <GetStarted hasBalance={balanceDCX > 0} hasApps={apps.length > 0} />}
          {apps.length > 0 && <AppList apps={apps} />}
        </div>
      )}
    </>
  );
};

export default View;
