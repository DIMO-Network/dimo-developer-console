'use client';
import { FC } from 'react';
import { useSession } from 'next-auth/react';

import './page.css';
import { Onboarding } from '@/app/app/components/Onboarding';
import { withNotifications } from '@/hoc';

const HomePage: FC = () => {
  const { data: session } = useSession();
  const { user: { name = '' } = {} } = session ?? {};

  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome {name}</p>
        <p className="sub-message">
          Learn how to get started with the DIMO API
        </p>
      </div>
      <Onboarding />
    </div>
  );
};

export default withNotifications(HomePage);
