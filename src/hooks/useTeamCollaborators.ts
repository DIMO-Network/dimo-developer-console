'use client';
import { useEffect, useState } from 'react';

import { getMyCollaborators } from '@/actions/team';
import { ITeamCollaborator } from '@/types/team';
import * as Sentry from '@sentry/nextjs';

export const useTeamCollaborators = () => {
  const [teamCollaborators, setTeamCollaborators] = useState<ITeamCollaborator[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    void refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const { data } = await getMyCollaborators();
      setTeamCollaborators(data);
    } catch (error) {
      Sentry.captureException(error);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, teamCollaborators, setTeamCollaborators, refreshData };
};

export default useTeamCollaborators;
