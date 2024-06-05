'use client';
import { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { AppCard } from '@/components/AppCard';
import { appListMock } from '@/mocks/appList';
import { Button } from '@/components/Button';
import { getUser } from '@/app/app/actions';
import { IApp } from '@/types/app';
import { IUser } from '@/types/user';

import './page.css';

const AppListPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<IUser>();
  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  const renderItem = (app: IApp) => {
    return <AppCard className="hover:!border-white" {...app} />;
  };

  return (
    <div className="app-list-page">
      <div className="welcome-message">
        <p className="title">Welcome {user?.name}</p>
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

export default AppListPage;
