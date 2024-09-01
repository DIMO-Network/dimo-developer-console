'use client';

import { FC, useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Anchor } from '@/components/Anchor';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/Button';
import { getApps } from '@/actions/app';
import { IApp } from '@/types/app';
import { Loader } from '@//components/Loader';
import { TeamRoles } from '@/types/team';

import './View.css';

export const View: FC = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const router = useRouter();
  const { data: session } = useSession();
  const { user: { name = '', role = '' } = {} } = session ?? {};

  useEffect(() => {
    setIsLoadingPage(true);
    getApps()
      .then(({ data: createdApps }) => setApps(createdApps))
      .finally(() => setIsLoadingPage(false));
  }, []);

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  const renderItem = (app: IApp) => {
    return (
      <Anchor href={`/app/details/${app?.id}`} key={app?.id}>
        <AppCard className="hover:!border-white" {...app} />
      </Anchor>
    );
  };

  return (
    <>
      {isLoadingPage && <Loader isLoading={true} />}
      {!isLoadingPage && (
        <div className="app-list-page">
          <div className="welcome-message">
            <p className="title">Welcome {name}</p>
          </div>

          <>
            <div className="description">
              <p className="title">Your applications</p>
              {role === TeamRoles.OWNER && (
                <Button
                  className="primary px-3 with-icon"
                  onClick={handleCreateApp}
                >
                  <PlusIcon className="w-4 h-4" />
                  Create new
                </Button>
              )}
            </div>
            <div className="app-list">{apps.map(renderItem)}</div>
          </>
        </div>
      )}
    </>
  );
};

export default View;
