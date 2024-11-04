import { FC } from 'react';
import { useRouter } from 'next/navigation';
// import { getMyApp } from '@/services/app';  // Commenting out for now
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';

interface App {
    id: string;
    name: string;
    status: string;
}

interface Props {
    apps: App[];
}

const AppsList: FC<Props> = ({ apps }) => {
    const router = useRouter();

    // Hardcoded handleAppClick for testing purposes
    const handleAppClick = (id: string) => {
        console.log(`Hardcoded App Click: App ID - ${id}`);
        router.push(`/app/${id}`);
    };

    return (
        <div className="apps-section">
            <div className="apps-header">
                <Title component="h2" className="text-lg">
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
