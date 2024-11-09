import { PlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { type FC } from 'react';
import { useRouter } from 'next/navigation';

import { TeamRoles } from '@/types/team';
import { IApp } from '@/types/app';
import { Anchor } from '@/components/Anchor';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/Button';

interface IProps {
  apps: IApp[];
}
export const AppList: FC<IProps> = ({ apps }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

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
    <div className="app-list-content">
      <div className="description">
        <p className="title">Your applications</p>
        {role === TeamRoles.OWNER && (
          <Button
            className="primary px-3 with-icon w-36 mr-4"
            onClick={handleCreateApp}
          >
            <PlusIcon className="w-4 h-4" />
            Create new
          </Button>
        )}
      </div>
      <div className="app-list">{apps.map(renderItem)}</div>
    </div>
  );
};

export default AppList;
