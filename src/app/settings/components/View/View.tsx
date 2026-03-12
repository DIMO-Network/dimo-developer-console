'use client';

import { FC, useState } from 'react';
import { Card } from '@/components/Card';
import { Loader } from '@/components/Loader';
import { PageSubtitle } from '@/components/PageSubtitle';
import { TeamFormModal } from '../TeamFormModal';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { Title } from '@/components/Title';
import { UserDetails } from '@/app/settings/components/UserDetails';
import { useMixPanel, useTeamCollaborators } from '@/hooks';

import './View.css';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';

const View: FC = () => {
  const { isLoading, teamCollaborators, refreshData } = useTeamCollaborators();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { trackEvent } = useMixPanel();

  return (
    <div className="settings-page">
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <>
          <PageSubtitle subtitle="Organization Settings" />
          <UserDetails />
          <Card className="primary team-information">
            <div className="team-header">
              <Title component="h2" className="settings-card-title">
                Team Management
              </Title>
            </div>
            <TeamManagement
              teamCollaborators={teamCollaborators.filter(({ deleted }) => !deleted)}
              refreshData={refreshData}
            />
          </Card>
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
