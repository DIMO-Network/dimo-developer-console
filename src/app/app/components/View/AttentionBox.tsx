import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';

const AttentionBox: FC = () => {
    return (
        <Card className="attention-card">
            <div className="attention-header">
                <Title component="h3" className="attention-title">
                    Attention Required
                </Title>
                <Button className="get-credits-btn">+ Get Credits</Button>
            </div>
            <p>
                Your developer account needs DCX to function properly. Please purchase
                more DCX to avoid service interruptions.
            </p>
        </Card>
    );
};

export default AttentionBox;
