'use client';
import { FC } from 'react';
import { useSession } from 'next-auth/react';

import { Loader } from '@/components/Loader';
import { TeamForm } from '@/app/settings/components/TeamForm';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { TeamRoles } from '@/types/team';
import { Title } from '@/components/Title';
import { UserForm } from '@/app/settings/components/UserForm';
import { useUser, useTeamCollaborators } from '@/hooks';

import './View.css';

const View: FC = () => {
  const { user } = useUser();
  const { isLoading, teamCollaborators } = useTeamCollaborators();
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
            <Title component="h2">Team Management</Title>
            {role === TeamRoles.OWNER && <TeamForm />}
            <TeamManagement teamCollaborators={teamCollaborators.data} />
          </div>
        </>
      )}
    </div>
  );
};

export default View;
