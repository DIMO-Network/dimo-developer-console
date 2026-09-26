'use client';

import { useState, type FC } from 'react';
import { capitalize } from 'lodash';
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
import { StatusChip, type StatusTone } from '@/components/StatusChip';
import { useGlobalAccount } from '@/hooks';

const STATUS_TONE: Record<string, StatusTone> = {
  [InvitationStatuses.ACCEPTED]: 'on',
  [InvitationStatuses.SENT]: 'pending',
  [InvitationStatuses.PENDING]: 'pending',
};

// The workspace owner has no invitation, so no chip; a status without a label
// still reads (capitalized) instead of rendering an empty chip.
const renderStatusChip = ({ status, role }: ITeamCollaborator) =>
  role === TeamRoles.OWNER ? null : (
    <StatusChip tone={STATUS_TONE[status] ?? 'off'}>
      {InvitationStatusLabels[status as InvitationStatuses] ?? capitalize(status)}
    </StatusChip>
  );

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

    return (
      <div className="flex flex-col items-start gap-1 md:whitespace-nowrap">
        <p>{name ?? email ?? ''}</p>
        {/* Phones have no Status column; the chip rides under the name instead. */}
        {teamCollaborator.role !== TeamRoles.OWNER && (
          <span className="md:hidden">{renderStatusChip(teamCollaborator)}</span>
        )}
      </div>
    );
  };

  const renderRole = ({ ...teamCollaborator }: ITeamCollaborator) => (
    <span className="text-muted whitespace-nowrap">
      {TeamRolesLabels[teamCollaborator.role as TeamRoles]}
    </span>
  );

  // A Cell falls back to String(value) for a falsy render, so the owner row
  // renders an empty span rather than the raw status.
  const renderStatus = (teamCollaborator: ITeamCollaborator) => (
    <span>{renderStatusChip(teamCollaborator)}</span>
  );

  const renderDeleteRemoveCollaborator = ({
    id,
    role: invitationRole,
  }: ITeamCollaborator) => {
    return (
      isOwner(currentUser!.role) &&
      invitationRole !== TeamRoles.OWNER && (
        <div
          className="flex flex-row items-center w-full h-full cursor-pointer text-muted hover:text-negative"
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
      const result = await deleteCollaborator(id);
      if (result?.success === false) {
        setLoadingStatus({
          label: result.message ?? 'Something went wrong',
          status: 'error',
        });
        return;
      }
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
      <div className="overflow-x-auto">
        <Table
          columns={[
            {
              label: 'User',
              name: 'User.name',
              render: renderUserName,
            },
            {
              label: 'Role',
              name: 'role',
              render: renderRole,
            },
            {
              label: 'Status',
              name: 'status',
              render: renderStatus,
              // Phones drop the column; the chip rides under the name instead.
              className: 'hidden md:table-cell',
            },
          ]}
          data={teamCollaborators}
          actions={[renderDeleteRemoveCollaborator]}
        />
      </div>
    </>
  );
};

export default TeamManagement;
