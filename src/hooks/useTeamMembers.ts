'use client';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTeamMembers } from '@/actions/teams';
import { useTeam } from '@/hooks/useTeam';
import { unwrap } from '@/utils/teamApiError';
import type { TeamMember } from '@/types/team';

export const teamMembersKey = (teamId: string | null) =>
  ['team-members', teamId] as const;

export const mergeMember = (list: TeamMember[], member: TeamMember): TeamMember[] =>
  list.some((m) => m.id === member.id)
    ? list.map((m) => (m.id === member.id ? member : m))
    : [...list, member];

// The active team's members (C7 order). A failure throws TeamApiError, so a
// NOT_A_MEMBER here reaches TeamProvider's removal check.
export const useTeamMembers = () => {
  const { activeTeam, isLoading: teamLoading } = useTeam();
  const queryClient = useQueryClient();
  const key = teamMembersKey(activeTeam?.id ?? null);
  const query = useQuery({
    queryKey: key,
    enabled: !teamLoading && !!activeTeam,
    retry: false,
    queryFn: async () => unwrap(await listTeamMembers()).members,
  });
  const upsertMember = useCallback(
    (member: TeamMember) =>
      queryClient.setQueryData<TeamMember[]>(key, (prev = []) =>
        mergeMember(prev, member),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, activeTeam?.id],
  );
  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    upsertMember,
  };
};
