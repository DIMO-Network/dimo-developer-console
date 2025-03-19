'use client';
import { FC, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/Button';
import { isOwner } from '@/utils/user';
import { Loader } from '@/components/Loader';
import { SupportAgentIcon } from '@/components/Icons';
import { SupportFormModal } from '@/app/settings/components/SupportFormModal';
import { TeamFormModal } from '../TeamFormModal';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { Title } from '@/components/Title';
import { UserForm } from '@/app/settings/components/UserForm';
import { useUser, useTeamCollaborators, useGlobalAccount } from '@/hooks';

import './View.css';

const View: FC = () => {
  const { user } = useUser();
  const { isLoading, teamCollaborators, refreshData } = useTeamCollaborators();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const { currentUser } = useGlobalAccount();
  // TODO: check why curremtUser!.role is not working here
  return (
    <div className="settings-page">
      <div className="titles">
        <Title>Settings</Title>
        <p className="subtitle">General Settings for the Developer Console</p>
      </div>
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <>
          <div className="user-information">
            <Title component="h2">User</Title>
            {user && <UserForm user={user} />}
          </div>
          <div className="team-information">
            <div className="team-header">
              <Title component="h2">Team Management</Title>
              {isOwner(currentUser?.role ?? '') && (
                <Button className="primary" onClick={() => setIsOpen(!isOpen)}>
                  Invite team <PlusIcon className="h-5 w-5" />
                </Button>
              )}
            </div>
            <TeamManagement
              teamCollaborators={teamCollaborators.filter(({ deleted }) => !deleted)}
              refreshData={refreshData}
            />
          </div>
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
