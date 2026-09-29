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
      <Title component="h4" className="text-card-title">
        User details
      </Title>
      <Card className="secondary user-detail-content">
        <p className="user-label">Name</p>
        <p className="user-value">{user.name}</p>
        <p className="user-label">Email</p>
        <p className="user-value">{user.email}</p>
      </Card>
    </Card>
  );
};

export default UserDetails;
