import { useState, type FC } from 'react';
import { useSession } from 'next-auth/react';
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

interface IProps {
  teamCollaborators: ITeamCollaborator[];
  refreshData: () => void;
}

export const TeamManagement: FC<IProps> = ({ teamCollaborators, refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

  const renderUserName = ({ ...teamCollaborator }: ITeamCollaborator) => {
    const { User: currentUser, email = '' } = teamCollaborator ?? {};
    const { name } = currentUser ?? {};

    return (
      <div className="flex flex-row items-center gap-3">
        <p>{name ?? email ?? ''}</p>
      </div>
    );
  };

  const renderRole = ({ ...teamCollaborator }: ITeamCollaborator) => {
    if (teamCollaborator.status === InvitationStatuses.PENDING) {
      return (
        <div className="rounded-lg py-2 px-4 outline-0 bg-grey-950 text-grey-50/50">
          {InvitationStatusLabels.PENDING}
        </div>
      );
    }

    return <>{TeamRolesLabels[teamCollaborator.role as TeamRoles]}</>;
  };

  const renderDeleteRemoveCollaborator = ({
    id,
    role: invitationRole,
  }: ITeamCollaborator) => {
    return (
      isOwner(role) &&
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
    </>
  );
};

export default TeamManagement;
