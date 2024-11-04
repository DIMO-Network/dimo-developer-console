import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';

interface AppItem {
    id: string;
    name: string;
}

interface Props {
    apps: AppItem[];
}

const AppsList: FC<Props> = ({ apps }) => {
    const router = useRouter();

    const handleAppClick = (id: string) => {
        console.log(`Navigating to app with ID: ${id}`);
        router.push(`/app/${id}`);
    };

    return (
        <div>
            <div className="apps-header">
                <Title component="h2" className="title">
                    Your Applications
                </Title>
                <Button className="create-app-btn">+ Create New</Button>
            </div>

            {apps.length > 0 ? (
                <div className="apps-list">
                    {apps.map((app) => (
                        <Card key={app.id} className="app-card" onClick={() => handleAppClick(app.id)}>
                            <p>{app.name}</p>
                        </Card>
                    ))}
                </div>
            ) : (
                <p>No applications found.</p>
            )}
        </div>
    );
};

export default AppsList;
