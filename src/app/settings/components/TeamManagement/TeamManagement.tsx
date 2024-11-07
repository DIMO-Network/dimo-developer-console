import { useState, type FC } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { TrashIcon } from '@heroicons/react/24/outline';

import {
  InvitationStatuses,
  InvitationStatusLabels,
  ITeamCollaborator,
  TeamRoles,
  TeamRolesLabels,
} from '@/types/team';
import { SelectField } from '@/components/SelectField';
import { Table } from '@/components/Table';
import { UserAvatar } from '@/components/UserAvatar';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { deleteCollaborator } from '@/actions/team';

interface IProps {
  teamCollaborators: ITeamCollaborator[];
  refreshData: () => void;
}

export const TeamManagement: FC<IProps> = ({ teamCollaborators, refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { control } = useForm();
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

  const renderUserName = ({ ...teamCollaborator }: ITeamCollaborator) => {
    const { User: currentUser, email = '' } = teamCollaborator ?? {};
    const { name } = currentUser ?? {};

    return (
      <div className="flex flex-row items-center gap-3">
        <UserAvatar name={name ?? email ?? ''} />
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

    return role === TeamRoles.OWNER ? (
      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, ref } }) => (
          <SelectField
            onChange={onChange}
            control={control}
            value={teamCollaborator.role}
            options={[
              { text: TeamRoles.COLLABORATOR, value: TeamRoles.COLLABORATOR },
              { text: TeamRoles.OWNER, value: TeamRoles.OWNER },
            ]}
            role="role-input"
            ref={ref}
          />
        )}
      />
    ) : (
      <>{TeamRolesLabels[teamCollaborator.role as TeamRoles]}</>
    );
  };

  const renderDeleteRemoveCollaborator = ({ id, role: invitationRole }: ITeamCollaborator) => {
    return (
      role === TeamRoles.OWNER && invitationRole !== TeamRoles.OWNER && (
        <div
          className="flex flex-row items-center w-full h-full cursor-pointer"
          onClick={() => handleDelete(id as string)}
          key={`delete-collaborator-action-${id}`}>
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
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  return (
    <>
      <LoadingModal
        isOpen={isOpened}
        setIsOpen={setIsOpened}
        {...loadingStatus}
      />

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
