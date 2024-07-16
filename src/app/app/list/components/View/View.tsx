'use client';

import { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Anchor } from '@/components/Anchor';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/Button';
import { getApps } from '@/actions/app';
import { IApp } from '@/types/app';

import './View.css';

const View = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const router = useRouter();
  const { data: session } = useSession();
  const { user: { name = '' } = {} } = session ?? {};

  useEffect(() => {
    getApps().then(({ data: createdApps }) => setApps(createdApps));
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

      <div className="app-list">{apps.map(renderItem)}</div>
    </div>
  );
};

export default View;
