import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';

const GetStartedSection: FC = () => {
    return (
        <Card className="get-started-card">
            <Title component="h3" className="text-lg">
                How to Get Started
            </Title>
            <div className="get-started-options">
                <Button className="create-app-button">Create an App</Button>
                <Button className="purchase-dcx-button">Purchase DCX</Button>
            </div>
        </Card>
    );
};

export default GetStartedSection;
