'use client';

import { useSession } from 'next-auth/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { Anchor } from '@/components/Anchor';
import { AppCard } from '@/components/AppCard';
import { appListMock } from '@/mocks/appList';
import { Button } from '@/components/Button';
import { IApp } from '@/types/app';

import './View.css';

const View = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { user: { name = '' } = {} } = session ?? {};

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  const renderItem = (app: IApp, id: number) => {
    return (
      <Anchor href={`/app/details/${id}`} key={app.name}>
        <AppCard className="hover:!border-white" {...app} />
      </Anchor>
    );
  };

  return (
    <div className="app-list-page">
      <div className="welcome-message">
        <p className="title">Welcome {name}</p>
      </div>
      <div className="description">
        <p className="title">Your applications</p>
        <Button className="primary px-3 with-icon" onClick={handleCreateApp}>
          <PlusIcon className="w-4 h-4" />
          Create new
        </Button>
      </div>

      <div className="app-list">{appListMock.map(renderItem)}</div>
    </div>
  );
};

export default View;
