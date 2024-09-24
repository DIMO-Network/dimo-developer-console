import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IInvitation, ITeamCollaborator } from '@/types/team';
import { Paginated } from '@/types/pagination';

export const getMyTeamCollaborators = async () => {
  const client = dimoDevAPIClient();
  return await client.get<Paginated<ITeamCollaborator>>(
    '/api/my/team/collaborator',
  );
};

export const inviteCollaboratorToMyTeam = async (invitation: IInvitation) => {
  const client = dimoDevAPIClient();
  return await client.post<{ message: string }>(
    '/api/my/team/invitation',
    invitation,
  );
};
