import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { AppCard } from '@/components/AppCard';
import './View.css';

interface AppItem {
  id: string;
  name: string;
  scope?: 'production' | 'sandbox'; // Default to 'production' or 'sandbox'
  description?: string;
}

interface Props {
  apps: AppItem[];
}

const AppsList: FC<Props> = ({ apps }) => {
  const router = useRouter();

  const handleAppClick = (id: string) => {
    router.push(`/app/${id}`);
  };

  const handleCreateNewClick = () => {
    router.push('/app/create');
  };

  return (
    <div>
      <div className="apps-header">
        <Title component="h2" className="title">
          Your Applications
        </Title>
        <Button className="create-app-btn" onClick={handleCreateNewClick}>
          + Create New
        </Button>
      </div>

      {apps.length > 0 ? (
        <div className="apps-list">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              className="app-card"
              name={app.name}
              scope={app.scope || 'sandbox'}
              description={app.description}
              onClick={() => handleAppClick(app.id)}
            />
          ))}
        </div>
      ) : (
        <p>No applications found.</p>
      )}
    </div>
  );
};

export default AppsList;
