'use client';
import { useEffect, useState, type FC } from 'react';

import { getUser } from '@/actions/user';
import { IUser } from '@/types/user';
import { Title } from '@/components/Title';
import { UserForm } from '@/app/app/settings/components/UserForm';

import './View.css';

const View: FC = () => {
  const [user, setUser] = useState<IUser>();
  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return (
    <div className="settings-page">
      <div className="titles">
        <Title>Settings</Title>
        <p className="subtitle">General Settings for the Developer Console</p>
      </div>
      <div className="user-information">
        <Title component="h2">User</Title>
        {user && <UserForm user={user} />}
      </div>
    </div>
  );
};

export default View;
