import { fetchMyTeams } from '@/services/teams';
import { apiResultResponse, upstreamFailure } from '@/utils/routeResponses';

// The signed-in user's teams. A GET, so it runs beside the page's other reads
// instead of queueing behind server actions.
export const GET = async () => {
  try {
    return apiResultResponse(await fetchMyTeams());
  } catch (error) {
    return upstreamFailure(error, 'Could not load teams');
  }
};
