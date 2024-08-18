import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IInvitation, ITeamCollaborator } from '@/types/team';
import { Paginated } from '@/types/pagination';

export const getMyTeamCollaborators = async () => {
  return await dimoDevAPIClient().get<Paginated<ITeamCollaborator>>(
    '/api/my/team/collaborator'
  );
};

export const inviteCollaboratorToMyTeam = async (invitation: IInvitation) => {
  return await dimoDevAPIClient().post<{ message: string }>(
    '/api/my/team/invitation',
    invitation
  );
};
