import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';


const GetStartedSection: FC = () => {
    return (
        <Card className="get-started-card">
            <Title component="h3" className="text-lg">
                How to Get Started
            </Title>
            <div className="get-started-options">
                <Button className="create-app-btn">Create an App</Button>
                <Button className="purchase-dcx-btn">Purchase DCX</Button>
            </div>
        </Card>
    );
};

export default GetStartedSection;
