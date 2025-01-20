'use client';
import { FC, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/Button';
import { isOwner } from '@/utils/user';
import { Loader } from '@/components/Loader';
import { TeamFormModal } from '../TeamFormModal';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { Title } from '@/components/Title';
import { UserForm } from '@/app/settings/components/UserForm';
import { useUser, useTeamCollaborators } from '@/hooks';

import './View.css';

const View: FC = () => {
  const { user } = useUser();
  const { isLoading, teamCollaborators, refreshData } = useTeamCollaborators();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

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
              {isOwner(role) && (
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
        </>
      )}
      <TeamFormModal isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
};

export default View;
