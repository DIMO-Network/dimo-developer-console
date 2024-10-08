import { type FC } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ITeamCollaborator, TeamRoles } from '@/types/team';
import { SelectField } from '@/components/SelectField';
import { Table } from '@/components/Table';
import { TrashIcon } from '@heroicons/react/24/outline';
import { UserAvatar } from '@/components/UserAvatar';

interface IProps {
  teamCollaborators: ITeamCollaborator[];
}

export const TeamManagement: FC<IProps> = ({ teamCollaborators }) => {
  const { control } = useForm();
  const renderUserName = ({ ...teamCollaborator }: ITeamCollaborator) => {
    const { name = '' } = teamCollaborator.User ?? {};
    return (
      <div className="flex flex-row items-center gap-3">
        <UserAvatar name={name ?? ''} />
        <p>{teamCollaborator.User?.name ?? ''}</p>
      </div>
    );
  };

  const renderRole = ({ ...teamCollaborator }: ITeamCollaborator) => {
    return (
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
    );
  };

  const renderDeleteRemoveCollaborator = () => {
    return (
      <div className="flex flex-row items-center w-full h-full">
        <TrashIcon className="w-5 h-5" />
      </div>
    );
  };

  return (
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
  );
};

export default TeamManagement;
