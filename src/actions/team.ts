'use server';

import {
  getMyTeamCollaborators,
  inviteCollaboratorToMyTeam,
} from '@/services/team';
import { IInvitation } from '@/types/team';
import { isAxiosError } from 'axios';

export const getMyCollaborators = async () => {
  const { data } = await getMyTeamCollaborators();
  return data;
};

export const inviteCollaborator = async (invitation: IInvitation) => {
  try {
    const { data } = await inviteCollaboratorToMyTeam(invitation);
    return data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      console.log({ error });
      throw new Error(error?.response?.data?.message || error?.message);
    }
  }
};
