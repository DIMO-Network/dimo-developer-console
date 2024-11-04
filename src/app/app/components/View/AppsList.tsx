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

    // Commenting out getMyApp and using hardcoded test function for now
    // const handleAppClick = async (id: string) => {
    //     try {
    //         const app = await getMyApp(id);
    //         router.push(`/app/${app.id}`);
    //     } catch (error) {
    //         console.error('Error fetching app details:', error);
    //     }
    // };

    // Hardcoded handleAppClick for testing purposes
    const handleAppClick = (id: string) => {
        console.log(`Hardcoded App Click: App ID - ${id}`);
        // Simulating navigation to the app details page
        router.push(`/app/${id}`);
    };

    return (
        <div>
            <Title component="h2" className="text-lg">
                Your Applications
            </Title>
            <Button className="create-app-btn">Create New</Button>

            {apps.length > 0 ? (
                <>
                    <div className="apps-list">
                        {apps.map((app) => (
                            <Card key={app.id} className="app-card">
                                <p>{app.name}</p>
                                <p>{app.status}</p>
                                <Button onClick={() => handleAppClick(app.id)}>View App</Button>
                            </Card>
                        ))}
                    </div>
                </>
            ) : (
                <p>No applications found.</p>
            )}
        </div>
    );
};

export default AppsList;
