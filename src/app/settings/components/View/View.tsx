'use client';

import { FC } from 'react';
import { UserDetails } from '@/app/settings/components/UserDetails';
import { TeamSection } from '@/app/settings/components/Team';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';

import './View.css';

const View: FC = () => (
  <div className="settings-page">
    <UserDetails />
    <TeamSection />
    <DeveloperSupportButton variant={'large'} />
  </div>
);

export default View;
