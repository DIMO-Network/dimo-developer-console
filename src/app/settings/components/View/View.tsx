'use client';
import { FC, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { isOwner } from '@/utils/user';
import { Loader } from '@/components/Loader';
import { TeamFormModal } from '../TeamFormModal';
import { TeamManagement } from '@/app/settings/components/TeamManagement';
import { Title } from '@/components/Title';
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
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && (
        <>
          {user && (
            <Card className="primary user-detail">
              <Title component="h4" className="settings-card-title">
                User Details
              </Title>
              <Card className="secondary user-detail-content">
                <Title component="h4" className="user-title">
                  Name
                </Title>
                <p className="user-description">{user.name}</p>
                <Title component="h4" className="user-title">
                  Email
                </Title>
                <p className="user-description">{user.email}</p>
              </Card>
            </Card>
          )}
          <Card className="primary team-information">
            <div className="team-header">
              <Title component="h4" className="settings-card-title">
                Team Management
              </Title>
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
          </Card>
        </>
      )}
      <TeamFormModal isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
};

export default View;
