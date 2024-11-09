'use server';

import {
  deleteMyTeamCollaborator,
  getMyTeamCollaborators,
  inviteCollaboratorToMyTeam,
} from '@/services/team';
import { IInvitation } from '@/types/team';
import { XiorError } from 'xior';

export const getMyCollaborators = async () => {
  const { data } = await getMyTeamCollaborators();
  return data;
};

export const inviteCollaborator = async (invitation: IInvitation) => {
  try {
    const { data } = await inviteCollaboratorToMyTeam(invitation);
    return data;
  } catch (error: unknown) {
    if (error instanceof XiorError) {
      console.error({ error });
      throw new Error(error?.response?.data?.message || error?.message);
    }
  }
};

export const deleteCollaborator = async (id: string) => {
  try {
    const { data } = await deleteMyTeamCollaborator(id);
    return data;
  } catch (error: unknown) {
    if (error instanceof XiorError) {
      console.error({ error });
      throw new Error(error?.response?.data?.message || error?.message);
    }
  }
};
