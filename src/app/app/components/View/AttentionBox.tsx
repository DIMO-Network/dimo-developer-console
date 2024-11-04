import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';

const AttentionBox: FC = () => {
    return (
        <Card className="attention-card">
            <div className="attention-header flex justify-between items-center">
                <div>
                    <Title component="h3" className="attention-title">
                        Attention Required
                    </Title>
                    <p className="attention-description">
                        Your developer account needs DCX to function properly. Please purchase
                        more DCX to avoid service interruptions.
                    </p>
                </div>
                <Button className="get-credits-btn">+ Get Credits</Button>
            </div>
        </Card>
    );
};

export default AttentionBox;
