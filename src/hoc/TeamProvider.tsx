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
import { setMemberDevJwtSigner } from '@/utils/devJwt';

const FLASH_KEY = 'teamFlash';
const LAST_TEAM_KEY = 'lastActiveTeam';
const FALLBACK_TEAM_ID = 'personal-fallback';
// The team list, kept in the query cache: every section mounts its own
// provider, and refetching on each move held up every license list (#326).
// Switching, joining, leaving and removal reload the page; sign-in and logout
// clear the cache.
export const MY_TEAMS_KEY = ['my-teams'];
// Until when console-api counts as down: sections mount on the fallback team
// instead of each waiting out the request again.
const TEAMS_UNAVAILABLE_KEY = ['my-teams-unavailable'];
const UNAVAILABLE_FOR_MS = 60_000;
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
  id: FALLBACK_TEAM_ID,
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
  // A remount with a cached list that agrees with the cookie starts settled.
  // Never on the first render after a page load: the cache is empty then, so
  // the server render and hydration agree.
  const [initial] = useState(() => {
    const cached = queryClient.getQueryData<TeamSummary[]>(MY_TEAMS_KEY);
    if (!cached) {
      const downUntil = queryClient.getQueryData<number>(TEAMS_UNAVAILABLE_KEY);
      return downUntil && downUntil > Date.now()
        ? { teams: [], activeId: null, unavailable: true }
        : null;
    }
    const cookieId = getActiveTeamCookie();
    const active = pickActive(cached, cookieId);
    return active && active.id === cookieId
      ? { teams: cached, activeId: active.id, unavailable: false }
      : null;
  });
  const [teams, setTeams] = useState<TeamSummary[]>(initial?.teams ?? []);
  const [activeId, setActiveId] = useState<string | null>(initial?.activeId ?? null);
  const [isLoading, setIsLoading] = useState(!initial);
  const [teamsUnavailable, setTeamsUnavailable] = useState(initial?.unavailable ?? false);

  const activeTeam = useMemo(() => {
    // No list (console-api down) or an empty one: the user's own wallet, as
    // before teams existed, so license lists don't wait for an owner forever.
    if (teamsUnavailable || (!isLoading && teams.length === 0))
      return currentUser ? fallbackTeam(currentUser) : null;
    return teams.find((t) => t.id === activeId) ?? null;
  }, [teams, activeId, teamsUnavailable, isLoading, currentUser]);

  // Before children render: they read stored developer JWTs during this render
  // and in effects that run before the provider's own effects.
  useMemo(
    () =>
      setMemberDevJwtSigner(
        activeTeam?.role === 'MEMBER' ? (currentUser?.walletAddress ?? null) : null,
      ),
    [activeTeam?.role, currentUser?.walletAddress],
  );

  useSignerRegistration(
    (activeTeam && !activeTeam.isPersonal ? activeTeam : teams.find((t) => !t.isPersonal))
      ?.ownerEmail ?? null,
  );

  const fetchTeams = useCallback(async (): Promise<TeamSummary[] | null> => {
    const result = await listMyTeams();
    if (!result.ok) return null;
    queryClient.setQueryData(MY_TEAMS_KEY, result.data.teams);
    return result.data.teams;
  }, [queryClient]);

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
    if (initial) return;
    let cancelled = false;
    void (async () => {
      const loaded =
        queryClient.getQueryData<TeamSummary[]>(MY_TEAMS_KEY) ?? (await fetchTeams());
      if (cancelled) return;
      if (!loaded) {
        queryClient.setQueryData(TEAMS_UNAVAILABLE_KEY, Date.now() + UNAVAILABLE_FOR_MS);
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
      // No cookie yet (a new session): name the team the console picked, so
      // X-Team-Id and this page agree instead of console-api choosing its own.
      if (active && cookieId !== active.id) setActiveTeamCookie(active.id);
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

  // Back on this tab: another tab may have switched team or signed out (the
  // cookie, and so X-Team-Id, is shared), or the user was removed while away.
  useEffect(() => {
    if (!activeTeam || activeTeam.id === FALLBACK_TEAM_ID) return;
    const recheck = async () => {
      if (document.visibilityState === 'hidden') return;
      const cookieId = getActiveTeamCookie();
      // Another tab switched team: this page belongs to the old one.
      if (cookieId && cookieId !== activeTeam.id) {
        hardNavigate('/app');
        return;
      }
      // No cookie: console-api's NOT_A_MEMBER cleared it, another tab signed
      // out, or the browser dropped it. The team list tells which.
      if (activeTeam.isPersonal) {
        if (!cookieId) setActiveTeamCookie(activeTeam.id);
        return;
      }
      const loaded = await fetchTeams();
      if (!loaded) return;
      if (!loaded.some((t) => t.id === activeTeam.id)) reportRemoved();
      else if (!cookieId) setActiveTeamCookie(activeTeam.id);
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
