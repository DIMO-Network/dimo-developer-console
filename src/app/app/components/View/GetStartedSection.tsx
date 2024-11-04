import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';

const GetStartedSection: FC = () => {
    return (
        <div className="get-started-section">
            <Title component="h3" className="get-started-title">
                How to Get Started
            </Title>
            <div className="get-started-cards">
                {/* Purchase DCX Card */}
                <Card className="get-started-card">
                    <div>
                        <p className="get-started-card-title">Purchase DCX</p>
                        <p className="get-started-card-description">
                            Obtain DCX to get credits, unlocking the DIMO developer ecosystem
                        </p>
                    </div>
                    <Button className="get-started-card-button">+ Purchase DCX</Button>
                </Card>

                {/* Create an Application Card */}
                <Card className="get-started-card">
                    <div>
                        <p className="get-started-card-title">Create an Application</p>
                        <p className="get-started-card-description">
                            Create an application as part of your Developer License
                        </p>
                    </div>
                    <Button className="get-started-card-button">+ Create an App</Button>
                </Card>
            </div>
        </div>
    );
};

export default GetStartedSection;
