'use client';
import React, {
  type ComponentType,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TeamContext, type Flash } from '@/context/TeamContext';
import { listMyTeams } from '@/actions/teams';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSignerRegistration } from '@/hooks/useSignerRegistration';
import { removedFromTeam } from '@/config/teamCopy';
import type { TeamSummary } from '@/types/team';
import type { IUserSession } from '@/types/user';
import { TeamApiError } from '@/utils/teamApiError';
import {
  clearActiveTeamCookie,
  getActiveTeamCookie,
  setActiveTeamCookie,
} from '@/utils/teamCookies';
import { hardNavigate } from '@/utils/hardNavigate';
import { getFromSession, removeFromSession, saveToSession } from '@/utils/sessionStorage';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';
import { PendingInvite } from '@/components/PendingInvite';

const FLASH_KEY = 'teamFlash';
const LAST_TEAM_KEY = 'lastActiveTeam';
export const TEAMS_UNAVAILABLE =
  "Couldn't load your teams. Showing your own licenses for now.";

const flashAfterReload = (flash: Flash) => saveToSession(FLASH_KEY, flash);

const pickActive = (teams: TeamSummary[], cookieId: string | null) =>
  teams.find((t) => t.id === cookieId) ??
  teams.find((t) => t.isPersonal) ??
  teams[0] ??
  null;

// Owners must not regress when console-api is down: their own wallet's licenses.
const fallbackTeam = (user: IUserSession): TeamSummary => ({
  id: 'personal-fallback',
  name: 'Your team',
  companyName: null,
  role: 'OWNER',
  ownerUserId: '',
  ownerEmail: user.email,
  ownerAddress: user.smartContractAddress,
  isPersonal: true,
});

export const TeamProvider = ({ children }: PropsWithChildren) => {
  const { currentUser } = useGlobalAccount();
  const { identifyUser, trackEvent } = useMixPanel();
  const queryClient = useQueryClient();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamsUnavailable, setTeamsUnavailable] = useState(false);

  const activeTeam = useMemo(() => {
    // No list (console-api down) or an empty one: the user's own wallet, as
    // before teams existed, so license lists don't wait for an owner forever.
    if (teamsUnavailable || (!isLoading && teams.length === 0))
      return currentUser ? fallbackTeam(currentUser) : null;
    return teams.find((t) => t.id === activeId) ?? null;
  }, [teams, activeId, teamsUnavailable, isLoading, currentUser]);

  useSignerRegistration(
    (activeTeam && !activeTeam.isPersonal ? activeTeam : teams.find((t) => !t.isPersonal))
      ?.ownerEmail ?? null,
  );

  const fetchTeams = useCallback(async (): Promise<TeamSummary[] | null> => {
    const result = await listMyTeams();
    return result.ok ? result.data.teams : null;
  }, []);

  const switchTeam = useCallback(
    (teamId: string, via: 'switcher' | 'invite' = 'switcher') => {
      trackEvent('Team Switched', { teamId, via });
      setActiveTeamCookie(teamId);
      hardNavigate('/app');
    },
    [trackEvent],
  );

  const reportRemoved = useCallback(() => {
    if (!activeTeam || activeTeam.isPersonal) return;
    const personal = teams.find((t) => t.isPersonal);
    flashAfterReload({ tone: 'error', message: removedFromTeam(activeTeam.name) });
    if (personal) setActiveTeamCookie(personal.id);
    else clearActiveTeamCookie();
    hardNavigate('/app');
  }, [activeTeam, teams]);

  // First load: the flash from the previous page, then the teams.
  useEffect(() => {
    const flash = getFromSession<Flash>(FLASH_KEY);
    if (flash) {
      removeFromSession(FLASH_KEY);
      if (flash.tone === 'error') toast.error(flash.message);
      else toast.success(flash.message);
    }
    let cancelled = false;
    void (async () => {
      const loaded = await fetchTeams();
      if (cancelled) return;
      if (!loaded) {
        clearActiveTeamCookie();
        setTeamsUnavailable(true);
        setIsLoading(false);
        toast.error(TEAMS_UNAVAILABLE);
        return;
      }
      setTeams(loaded);
      const cookieId = getActiveTeamCookie();
      const active = pickActive(loaded, cookieId);
      if (cookieId && active?.id !== cookieId) {
        // The cookie names a team this user is no longer in. /api/my/teams
        // ignores X-Team-Id (C7), so the list above is trustworthy.
        const last = getFromLocalStorage<{ id: string; name: string }>(LAST_TEAM_KEY);
        flashAfterReload({
          tone: 'error',
          message: removedFromTeam(last?.id === cookieId ? last.name : 'that team'),
        });
        if (active) setActiveTeamCookie(active.id);
        else clearActiveTeamCookie();
        hardNavigate('/app');
        return;
      }
      if (active) saveToLocalStorage(LAST_TEAM_KEY, { id: active.id, name: active.name });
      setActiveId(active?.id ?? null);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per page load; switching teams reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // $role for Mixpanel comes from the active team once it is known.
  useEffect(() => {
    if (!currentUser || !activeTeam) return;
    identifyUser(currentUser.smartContractAddress, {
      $role: activeTeam.role,
      $team: activeTeam.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.smartContractAddress, activeTeam?.id]);

  // Removed while away: re-check when the tab becomes visible or focused.
  useEffect(() => {
    if (!activeTeam || activeTeam.isPersonal) return;
    const recheck = async () => {
      if (document.visibilityState === 'hidden') return;
      const loaded = await fetchTeams();
      if (loaded && !loaded.some((t) => t.id === activeTeam.id)) reportRemoved();
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [activeTeam, fetchTeams, reportRemoved]);

  // Removed mid-session: any team-scoped query that fails with NOT_A_MEMBER.
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return;
        const error = event.action.error;
        if (error instanceof TeamApiError && error.code === 'NOT_A_MEMBER')
          reportRemoved();
      }),
    [queryClient, reportRemoved],
  );

  const value = useMemo(
    () => ({
      teams,
      activeTeam,
      isLoading,
      teamsUnavailable,
      isOwner: activeTeam?.role === 'OWNER' && !!activeTeam.ownerAddress,
      isMember: activeTeam?.role === 'MEMBER',
      ownerAddress: activeTeam?.ownerAddress ?? null,
      switchTeam,
      refreshTeams: async () => {
        const loaded = await fetchTeams();
        if (loaded) setTeams(loaded);
      },
      reportRemoved,
      flashAfterReload,
    }),
    [
      teams,
      activeTeam,
      isLoading,
      teamsUnavailable,
      switchTeam,
      fetchTeams,
      reportRemoved,
    ],
  );

  return (
    <TeamContext.Provider value={value}>
      {children}
      {!isLoading && !teamsUnavailable && (
        <PendingInvite
          onJoined={(team) => {
            // The accepted team (always MEMBER) becomes active by its id.
            flashAfterReload({ tone: 'success', message: `You joined ${team.name}` });
            switchTeam(team.id, 'invite');
          }}
        />
      )}
    </TeamContext.Provider>
  );
};

export const withTeams = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => (
    <TeamProvider>
      <WrappedComponent {...props} />
    </TeamProvider>
  );
  HOC.displayName = `withTeams(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
