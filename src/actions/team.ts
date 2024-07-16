'use server';

import { getMyTeamCollaborators } from '@/services/team';

export const getMyCollaborators = async () => {
  const { data } = await getMyTeamCollaborators();
  return data;
};
