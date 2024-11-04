import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';


const AttentionBox: FC = () => {
    return (
        <Card className="attention-card">
            <Title component="h3" className="attention-title">
                Attention Required
            </Title>
            <p>
                Your developer account needs DCX to function properly. Please purchase
                more DCX to avoid service interruptions.
            </p>
            <Button className="get-credits-btn">Get Credits</Button>
        </Card>
    );
};

export default AttentionBox;
