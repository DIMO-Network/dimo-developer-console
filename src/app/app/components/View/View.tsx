'use client';
import { FC } from 'react';
import { useSession } from 'next-auth/react';

import { Onboarding } from '@/app/app/components/Onboarding';

import './View.css';

export const View: FC = () => {

  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome to DIMO Developer Console</p>
        <p className="sub-message">
          Learn how to get started with the{' '}
          <span className="text-primary-200">DIMO API</span>
        </p>
      </div>
      <Onboarding />
    </div>
  );
};

export default View;
