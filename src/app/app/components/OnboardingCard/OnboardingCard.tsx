import { FC, ReactNode } from 'react';

import { Card } from '@/components/Card';

import './OnboardingCard.css';

interface IProps {
  title: string;
  description: string;
  action: ReactNode;
}

export const OnboardingCard: FC<IProps> = ({ title, description, action }) => {
  return (
    <Card className="onboarding-card card-border">
      <div className="step-content">
        <p className="title">{title}</p>
        <p className="description">{description}</p>
      </div>
      <div className="step-action">{action}</div>
    </Card>
  );
};
