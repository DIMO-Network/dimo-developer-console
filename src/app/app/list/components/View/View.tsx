'use client';
import { type FC } from 'react';

import { Loader } from '@//components/Loader';
import { AppList } from '@/app/app/list/components/AppList';
import { Banner } from '@/app/app/list/components/Banner';
import { useOnboarding } from '@/hooks';

import './View.css';

export const View: FC = () => {
  const { isLoading, apps, balance } = useOnboarding();

  if (isLoading) {
    return <Loader isLoading={true} />;
  }

  return (
    <div className="app-list-page">
      <div className="welcome-message">
        <p className="title">Welcome to DIMO Developer Console</p>
      </div>
      {!(balance && apps.length) && <Banner />}
      <AppList apps={apps}/>
    </div>
  );
};

export default View;
