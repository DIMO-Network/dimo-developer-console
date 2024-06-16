'use client';
import { useEffect, useState } from 'react';

import { getMyCollaborators } from '@/actions/team';
import { ITeamCollaborator } from '@/types/team';
import { Paginated } from '@/types/pagination';

export const useTeamCollaborators = () => {
  const [teamCollaborators, setTeamCollaborators] = useState<
    Paginated<ITeamCollaborator>
  >({ data: [], totalItems: 0, totalPages: 0 });

  useEffect(() => {
    getMyCollaborators().then(setTeamCollaborators);
  }, []);

  return { teamCollaborators, setTeamCollaborators };
};

export default useTeamCollaborators;
