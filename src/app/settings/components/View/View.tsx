'use client';

import { FC, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { isOwner } from '@/utils/user';
import { Loader } from '@/components/Loader';
import { PageSubtitle } from '@/components/PageSubtitle';
import { SupportAgentIcon } from '@/components/Icons';
import { SupportFormModal } from '@/app/settings/components/SupportFormModal';
import { TeamFormModal } from '../TeamFormModal';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { Title } from '@/components/Title';
import { UserDetails } from '@/app/settings/components/UserDetails';
import { useTeamCollaborators, useGlobalAccount } from '@/hooks';

import './View.css';

const View: FC = () => {
  const { isLoading, teamCollaborators, refreshData } = useTeamCollaborators();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const { currentUser } = useGlobalAccount();
  // TODO: check why curremtUser!.role is not working here
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
              {isOwner(currentUser?.role ?? '') && (
                <Button className="primary" onClick={() => setIsOpen(!isOpen)}>
                  <PlusIcon className="h-5 w-5" /> Invite Team Member
                </Button>
              )}
            </div>
            <TeamManagement
              teamCollaborators={teamCollaborators.filter(({ deleted }) => !deleted)}
              refreshData={refreshData}
            />
          </Card>
          <div className="flex">
            <Button
              className="primary-outline"
              onClick={() => setIsSupportModalOpen(true)}
            >
              <SupportAgentIcon className="fill-primary h-5 w-5" color="currentColor" />
              Developer support
            </Button>
          </div>
        </>
      )}
      <SupportFormModal isOpen={isSupportModalOpen} setIsOpen={setIsSupportModalOpen} />
      <TeamFormModal isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
};

export default View;
