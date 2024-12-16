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
    return { success: true, message: data.message };
  } catch (error: unknown) {
    if (error instanceof XiorError) {
      console.error({ error });
      return {
        success: false,
        message: error?.response?.data?.message || error?.message,
      };
    }

    return {
      success: false,
      message: 'Something went wrong',
    };
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
