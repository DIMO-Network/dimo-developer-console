import { useState, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import * as Sentry from '@sentry/nextjs';

import {
  InvitationStatuses,
  InvitationStatusLabels,
  ITeamCollaborator,
  TeamRoles,
  TeamRolesLabels,
} from '@/types/team';
import { deleteCollaborator } from '@/actions/team';
import { isOwner } from '@/utils/user';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { Card } from '@/components/Card';
import { useGlobalAccount } from '@/hooks';

interface IProps {
  teamCollaborators: ITeamCollaborator[];
  refreshData: () => void;
}

export const TeamManagement: FC<IProps> = ({ teamCollaborators, refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { currentUser } = useGlobalAccount();

  const renderUserName = ({ ...teamCollaborator }: ITeamCollaborator) => {
    const { User: me, email = '' } = teamCollaborator ?? {};
    const { name } = me ?? {};
    const isPending = teamCollaborator.status === InvitationStatuses.PENDING;

    return (
      <div className="flex flex-row items-center gap-3">
        <p>
          {name ?? email ?? ''} {isPending && `(${InvitationStatusLabels.PENDING})`}
        </p>
      </div>
    );
  };

  const renderRole = ({ ...teamCollaborator }: ITeamCollaborator) => (
    <>{TeamRolesLabels[teamCollaborator.role as TeamRoles]}</>
  );

  const renderDeleteRemoveCollaborator = ({
    id,
    role: invitationRole,
  }: ITeamCollaborator) => {
    return (
      isOwner(currentUser!.role) &&
      invitationRole !== TeamRoles.OWNER && (
        <div
          className="flex flex-row items-center w-full h-full cursor-pointer"
          onClick={() => handleDelete(id as string)}
          key={`delete-collaborator-action-${id}`}
        >
          <TrashIcon className="w-5 h-5" />
        </div>
      )
    );
  };

  const handleDelete = async (id: string) => {
    try {
      setIsOpened(true);
      setLoadingStatus({
        label: 'Deleting the selected collaborator',
        status: 'loading',
      });
      await deleteCollaborator(id);
      setLoadingStatus({ label: 'Collaborator removed', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      Sentry.captureException(error);
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  return (
    <>
      <LoadingModal isOpen={isOpened} setIsOpen={setIsOpened} {...loadingStatus} />
      <Card className="secondary team-information">
        <Table
          columns={[
            {
              label: 'User',
              name: 'User.name',
              render: renderUserName,
            },
            {
              name: 'role',
              render: renderRole,
            },
          ]}
          data={teamCollaborators}
          actions={[renderDeleteRemoveCollaborator]}
        />
      </Card>
    </>
  );
};

export default TeamManagement;
