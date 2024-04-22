import { FC } from 'react';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

import './OnboardingCard.css';

interface IProps {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}

export const OnboardingCard: FC<IProps> = ({
  title,
  description,
  action,
  onClick,
}) => {
  return (
    <Card className="onboarding-card card-border">
      <div className="step-content">
        <p className="title">{title}</p>
        <p className="description">{description}</p>
      </div>
      <div className="step-action">
        <Button className="primary px-4 w-full" onClick={onClick}>
          {action}
        </Button>
      </div>
    </Card>
  );
};
