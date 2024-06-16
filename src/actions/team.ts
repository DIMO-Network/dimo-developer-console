'use server';

import { getMyTeamCollaborators } from '@/services/team';

export const getMyCollaborators = async () => {
  return await getMyTeamCollaborators();
};
