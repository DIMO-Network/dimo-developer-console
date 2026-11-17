import React, { type FC } from 'react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { useUser } from '@/hooks/useUser';

import './UserDetails.css';

export const UserDetails: FC = () => {
  const t = useTranslations('settings');
  const { data: user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Section>
      <SectionHeader title={t('userDetails.title')} />
      <div className="user-detail-fields">
        <div className="user-field">
          <span className="user-field-label">{t('userDetails.name')}</span>
          <span className="user-field-value">{user.name}</span>
        </div>
        <div className="user-field">
          <span className="user-field-label">{t('userDetails.email')}</span>
          <span className="user-field-value">{user.email}</span>
        </div>
      </div>
    </Section>
  );
};

export default UserDetails;
