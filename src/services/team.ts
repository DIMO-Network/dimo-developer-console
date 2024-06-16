import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { ITeamCollaborator } from '@/types/team';
import { Paginated } from '@/types/pagination';

export const getMyTeamCollaborators = async () => {
  return await dimoDevAPIClient().get<Paginated<ITeamCollaborator>>(
    '/api/my/team/collaborator'
  );
};
