'use client';
import { FC, useEffect, useState } from 'react';
import { withNotifications } from '@/hoc';

import './page.css';
import { getUser } from './actions';
import { IUser } from '@/types/user';
import Onboarding from './components/Onborading/Onboarding';

const HomePage: FC = () => {
  const [user, setUser] = useState<IUser>();
  useEffect(() => {
    getUser().then(setUser);
  }, []);

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

export default withNotifications(HomePage);
