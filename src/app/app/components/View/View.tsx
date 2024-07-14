'use client';
import { FC } from 'react';
import { useSession } from 'next-auth/react';

import { Onboarding } from '@/app/app/components/Onboarding';
import { useOnboarding } from '@/hooks';

import './View.css';

export const View: FC = () => {
  const { data: session } = useSession();
  const { user: { name = '' } = {} } = session ?? {};
  const { isOnboardingCompleted } = useOnboarding();

  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome {name}</p>
        <p className="sub-message">
          Learn how to get started with the DIMO API
        </p>
      </div>
      {!isOnboardingCompleted && <Onboarding />}
    </div>
  );
};

export default View;
