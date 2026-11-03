import { fetchTeamMembers } from '@/services/teams';
import { apiResultResponse, upstreamFailure } from '@/utils/routeResponses';

// The active team's members (X-Team-Id comes from the active_team cookie).
export const GET = async () => {
  try {
    return apiResultResponse(await fetchTeamMembers());
  } catch (error) {
    return upstreamFailure(error, 'Could not load team members');
  }
};
