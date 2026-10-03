'use client';
import { createContext } from 'react';
import type { TeamSummary } from '@/types/team';

export type Flash = { tone: 'success' | 'error'; message: string };

export interface TeamContextValue {
  teams: TeamSummary[];
  activeTeam: TeamSummary | null;
  isLoading: boolean;
  teamsUnavailable: boolean;
  isOwner: boolean;
  isMember: boolean;
  ownerAddress: `0x${string}` | null;
  switchTeam: (teamId: string, via?: 'switcher' | 'invite') => void;
  refreshTeams: () => Promise<void>;
  reportRemoved: () => void;
  flashAfterReload: (flash: Flash) => void;
}

// Outside a TeamProvider (unit tests, guest pages) code behaves as the owner it
// always was before teams existed.
export const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  isLoading: false,
  teamsUnavailable: false,
  isOwner: true,
  isMember: false,
  ownerAddress: null,
  switchTeam: () => {},
  refreshTeams: async () => {},
  reportRemoved: () => {},
  flashAfterReload: () => {},
});
