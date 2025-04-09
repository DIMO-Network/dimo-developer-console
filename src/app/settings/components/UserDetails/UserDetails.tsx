import React, { type FC } from 'react';

import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { useUser } from '@/hooks';

import './UserDetails.css';

export const UserDetails: FC = () => {
  const { data: user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Card className="primary user-detail">
      <Title component="h4" className="settings-card-title">
        User Details
      </Title>
      <Card className="secondary user-detail-content">
        <Title component="h4" className="user-title">
          Name
        </Title>
        <p className="user-description">{user.name}</p>
        <Title component="h4" className="user-title">
          Email
        </Title>
        <p className="user-description">{user.email}</p>
      </Card>
    </Card>
  );
};

export default UserDetails;
