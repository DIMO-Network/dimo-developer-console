import {FC, useContext} from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import './View.css';
import {CreditsContext} from "@/context/creditsContext";


const AttentionBox: FC = () => {

    const { setIsOpen } = useContext(CreditsContext);

    const handleOpenBuyCreditsModal = () => setIsOpen(true);

    return (
        <Card className="attention-card">
            <Title component="h3" className="attention-title">
                Attention Required
            </Title>
            <p>
                Your developer account needs DCX to function properly. Please purchase
                more DCX to avoid service interruptions.
            </p>
            <Button className="get-credits-btn" onClick={handleOpenBuyCreditsModal}>
                + Get Credits
            </Button>
        </Card>
    );
};

export default AttentionBox;
