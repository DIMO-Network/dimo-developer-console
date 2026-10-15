'use client';
import { useQuery } from '@tanstack/react-query';

import { getMyCollaborators } from '@/actions/team';
import { ITeamCollaborator } from '@/types/team';
import * as Sentry from '@sentry/nextjs';

// A query rather than an effect, so going back to Settings shows the team at
// once and refreshes it behind the page instead of behind a full-page loader.
export const useTeamCollaborators = () => {
  const { data, isPending, refetch } = useQuery({
    queryKey: ['team-collaborators'],
    queryFn: async (): Promise<ITeamCollaborator[]> => {
      try {
        const { data } = await getMyCollaborators();
        return data;
      } catch (error) {
        Sentry.captureException(error);
        console.error(error);
        return [];
      }
    },
  });

  const refreshData = async () => {
    await refetch();
  };

  return { isLoading: isPending, teamCollaborators: data ?? [], refreshData };
};

export default useTeamCollaborators;
