'use client';
import { FC } from 'react';
import { withNotifications, withRainbowKit } from '@/hoc';

import './page.css';
import Onboarding from './components/Onborading/Onboarding';
import { useUser } from '@/hooks';

const HomePage: FC = () => {
  const { user } = useUser();

  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome {user?.name}</p>
        <p className="sub-message">
          Learn how to get started with the DIMO API
        </p>
      </div>
      <Onboarding />
    </div>
  );
};

export default withRainbowKit(withNotifications(HomePage));
