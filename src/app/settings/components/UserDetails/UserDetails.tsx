import React, { type FC } from 'react';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { useUser } from '@/hooks';

import './UserDetails.css';

export const UserDetails: FC = () => {
  const { data: user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Section>
      <SectionHeader title="User Details" />
      <div className="user-detail-fields">
        <div className="user-field">
          <span className="user-field-label">Name</span>
          <span className="user-field-value">{user.name}</span>
        </div>
        <div className="user-field">
          <span className="user-field-label">Email</span>
          <span className="user-field-value">{user.email}</span>
        </div>
      </div>
    </Section>
  );
};

export default UserDetails;
