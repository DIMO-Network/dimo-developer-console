import { FC } from 'react';
import { useRouter } from 'next/navigation';
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

    const handleAppClick = (id: string) => {
        console.log(`Hardcoded App Click: App ID - ${id}`);
        router.push(`/app/${id}`);
    };

    return (
        <div className="apps-section">
            <div className="apps-header flex justify-between items-center">
                <Title component="h2" className="apps-title">
                    Your Applications
                </Title>
                <Button className="create-app-btn">+ Create New</Button>
            </div>
            <div className="apps-list">
                {apps.map((app) => (
                    <Card
                        key={app.id}
                        className="app-card"
                        onClick={() => handleAppClick(app.id)}
                    >
                        <div>
                            <p className="app-card-title">{app.name}</p>
                            <p className="app-card-status">{app.status}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default AppsList;
