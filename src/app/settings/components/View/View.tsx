'use client';

import { FC, useState } from 'react';
import { Loader } from '@/components/Loader';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { TeamFormModal } from '../TeamFormModal';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { UserDetails } from '@/app/settings/components/UserDetails';
import { useMixPanel, useTeamCollaborators } from '@/hooks';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';

import './View.css';

const View: FC = () => {
  const { isLoading, teamCollaborators, refreshData } = useTeamCollaborators();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { trackEvent } = useMixPanel();

  return (
    <div className="settings-page">
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <>
          <UserDetails />
          <Section>
            <SectionHeader title="Team Management" />
            <TeamManagement
              teamCollaborators={teamCollaborators.filter(({ deleted }) => !deleted)}
              refreshData={refreshData}
            />
          </Section>
          <DeveloperSupportButton variant={'large'} />
        </>
      )}
      <TeamFormModal
        isOpen={isOpen}
        setIsOpen={(value: boolean) => {
          trackEvent('Open Developer Support Form');
          setIsOpen(value);
        }}
      />
    </div>
  );
};

export default View;
