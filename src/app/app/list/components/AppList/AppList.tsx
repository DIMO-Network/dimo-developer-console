import { type FC } from 'react';

import { AppCard } from '@/components/AppCard';
import { IApp } from '@/types/app';
import { isOwner } from '@/utils/user';

import './AppList.css';
import EmptyList from '@/app/app/list/components/EmptyList';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';
import { useGlobalAccount } from '@/hooks';

interface IProps {
  apps: IApp[];
}
export const AppList: FC<IProps> = ({ apps }) => {
  const { currentUser } = useGlobalAccount();
  const renderItem = (app: IApp, idx: number) => {
    return <AppCard key={app.id ?? idx} className="hover:!border-white" {...app} />;
  };

  return (
    <div className="app-list-content">
      <div className="description">
        <p className="title">Your Apps</p>
        {isOwner(currentUser!.role) && !!apps.length && <CreateAppButton />}
      </div>
      {apps.length ? (
        <div className="app-list">{apps.map(renderItem)}</div>
      ) : (
        <div className={'empty-list'}>
          <EmptyList />
        </div>
      )}
    </div>
  );
};

export default AppList;
