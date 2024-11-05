'use client';

import { FC, useEffect, useState } from 'react';

import { getApps } from '@/actions/app';
import { IApp } from '@/types/app';
import { Loader } from '@//components/Loader';
import { AppList } from '@/app/app/list/components/AppList';

import './View.css';

export const View: FC = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);

  useEffect(() => {
    setIsLoadingPage(true);
    getApps()
      .then(({ data: createdApps }) => setApps(createdApps))
      .finally(() => setIsLoadingPage(false));
  }, []);

  return (
    <>
      {isLoadingPage && <Loader isLoading={true} />}
      {!isLoadingPage && (
        <div className="app-list-page">
          <div className="welcome-message">
            <p className="title">Welcome to DIMO Developer Consoleh</p>
          </div>
          {apps.length && <AppList apps={apps} />}
        </div>
      )}
    </>
  );
};

export default View;
