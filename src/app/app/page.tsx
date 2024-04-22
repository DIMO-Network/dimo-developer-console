'use client';
import { OnboardingCard } from '@/app/app/components';

import './page.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome John</p>
        <p className="sub-message">
          Learn how to get started with the DIMO API
        </p>
      </div>
      <div className="onboarding-steps">
        <OnboardingCard
          title="Connect a Wallet & Get Credits"
          description="Click the button to connect a spender wallet and start building."
          action="Connect Wallet"
          onClick={() => {}}
        />
        <OnboardingCard
          title="Create your first application"
          description="Click the button to receive your credentials and access DIMO data in minutes."
          action="Create app"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
