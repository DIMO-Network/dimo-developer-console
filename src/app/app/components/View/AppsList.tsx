import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';

interface App {
    id: string;
    name: string;
    status: string;
}

interface Props {
    apps: App[];
    onAppClick: (id: string) => void;
}

const AppsList: FC<Props> = ({ apps, onAppClick }) => {
    return (
        <div>
            <Title component="h2" className="text-lg">
                Your Applications
            </Title>
            {apps.length > 0 ? (
                <div className="app-list">
                    {apps.map((app) => (
                        <Card key={app.id} className="app-card">
                            <p>{app.name}</p>
                            <p>{app.status}</p>
                            <Button onClick={() => onAppClick(app.id)}>View App</Button>
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
