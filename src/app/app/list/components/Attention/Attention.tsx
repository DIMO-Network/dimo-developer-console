import { PlusIcon } from '@heroicons/react/24/outline';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useOnboarding } from '@/hooks';

import './Attention.css';

export const Attention = () => {
  const { handleOpenBuyCreditsModal } = useOnboarding();

  return (
    <div className="attention-content">
      <Card className="attention-card border">
        <div className="attention-message">
          <p className="attention-title">Attention required</p>
          <p className="attention-description">
            Your developer account needs DCX to function properly, please purchase more
            DCX to avoid service interruptions.
          </p>
        </div>
        <div className="attention-cta">
          <Button
            className="primary w-full with-icon"
            type="button"
            onClick={handleOpenBuyCreditsModal}
          >
            <PlusIcon className="h-5 w-5" />
            Get credits
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Attention;
