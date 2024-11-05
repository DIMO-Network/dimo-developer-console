'use client';
import { type FC } from 'react';

import { Loader } from '@//components/Loader';
import { AppList } from '@/app/app/list/components/AppList';
import { Banner } from '@/app/app/list/components/Banner';
import { useOnboarding } from '@/hooks';

import './View.css';

export const View: FC = () => {
  const { isLoading, apps, cta } = useOnboarding();

  return (
    <>
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <div className="app-list-page">
          <div className="welcome-message">
            <p className="title">Welcome to DIMO Developer Consoleh</p>
          </div>
          <Banner cta={cta} />
          {apps.length && <AppList apps={apps} />}
        </div>
      )}
    </>
  );
};

export default View;
