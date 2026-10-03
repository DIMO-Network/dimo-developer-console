import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listMyTeams: jest.fn() }));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
jest.mock('@/hooks/useSignerRegistration', () => ({ useSignerRegistration: jest.fn() }));
const identifyUser = jest.fn();
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({
  useMixPanel: () => ({ identifyUser, trackEvent }),
}));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { listMyTeams } from '@/actions/teams';
import { hardNavigate } from '@/utils/hardNavigate';
import { toast } from 'sonner';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { TeamProvider } from '@/hoc/TeamProvider';
import { useTeam } from '@/hooks/useTeam';
import { TeamApiError } from '@/utils/teamApiError';
import type { TeamSummary } from '@/types/team';

const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const PERSONAL: TeamSummary = {
  id: 'team-harness',
  name: 'Harness Motors',
  companyName: 'Harness Motors',
  role: 'OWNER',
  ownerUserId: 'user-harness',
  ownerEmail: 'jane@harness.dev',
  ownerAddress: KERNEL,
  isPersonal: true,
};
const ACME: TeamSummary = {
  ...PERSONAL,
  id: 'team-acme',
  name: 'Acme Mobility',
  role: 'MEMBER',
  ownerUserId: 'user-acme',
  ownerEmail: 'ops@acme.dev',
  ownerAddress: '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a',
  isPersonal: false,
};
const USER = {
  email: 'jane@harness.dev',
  subOrganizationId: 'sub',
  walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' as const,
  smartContractAddress: KERNEL as `0x${string}`,
};

let api: ReturnType<typeof useTeam>;
const Probe = () => {
  api = useTeam();
  return (
    <div data-testid="probe">
      {JSON.stringify({
        loading: api.isLoading,
        active: api.activeTeam?.id ?? null,
        isOwner: api.isOwner,
        isMember: api.isMember,
        owner: api.ownerAddress,
        unavailable: api.teamsUnavailable,
      })}
    </div>
  );
};
const probe = () => JSON.parse(screen.getByTestId('probe').textContent!);
const renderProvider = (child: React.ReactNode = <Probe />, client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <GlobalAccountContext.Provider
        value={{
          currentUser: USER,
          validateCurrentSession: async () => USER,
          getCurrentDcxBalance: async () => 0,
          getCurrentDimoBalance: async () => 0,
          logout: async () => {},
        }}
      >
        <TeamProvider>{child}</TeamProvider>
      </GlobalAccountContext.Provider>
    </QueryClientProvider>,
  );

describe('TeamProvider', () => {
  beforeEach(() => {
    document.cookie = 'active_team=; Path=/; Max-Age=0';
    sessionStorage.clear();
    localStorage.clear();
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: true,
      data: { teams: [PERSONAL, ACME] },
    });
  });

  it('is not an owner until the teams load, then defaults to the personal team', async () => {
    renderProvider();
    expect(probe()).toMatchObject({ loading: true, isOwner: false });
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'team-harness',
      isOwner: true,
      isMember: false,
      owner: KERNEL,
    });
    expect(identifyUser).toHaveBeenCalledWith(KERNEL, {
      $role: 'OWNER',
      $team: 'team-harness',
    });
  });

  it('uses the team named by the active_team cookie', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'team-acme',
      isMember: true,
      owner: ACME.ownerAddress,
    });
  });

  it('falls back to the personal team once, with the C8 removed copy, for a stale cookie', async () => {
    localStorage.setItem(
      'lastActiveTeam',
      JSON.stringify({ id: 'team-gone', name: 'Gone Co' }),
    );
    document.cookie = 'active_team=team-gone; Path=/';
    renderProvider();
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(document.cookie).toContain('active_team=team-harness');
    expect(JSON.parse(sessionStorage.getItem('teamFlash')!)).toEqual({
      tone: 'error',
      message: "You're no longer a member of Gone Co.",
    });
  });

  it('treats a user with no team as the owner of their own wallet, without a toast', async () => {
    (listMyTeams as jest.Mock).mockResolvedValue({ ok: true, data: { teams: [] } });
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'personal-fallback',
      isOwner: true,
      owner: KERNEL,
      unavailable: false,
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('is not an owner while the active team has no owner wallet', async () => {
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: true,
      data: { teams: [{ ...PERSONAL, ownerAddress: null }] },
    });
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({ active: 'team-harness', isOwner: false });
  });

  it('keeps owners working when teams cannot load', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: null,
      message: 'x',
    });
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'personal-fallback',
      isOwner: true,
      owner: KERNEL,
      unavailable: true,
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't load your teams. Showing your own licenses for now.",
    );
    expect(document.cookie).not.toContain('active_team=team-acme');
  });

  it('reportRemoved flashes the C8 copy, points at the personal team and reloads', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    act(() => api.reportRemoved());
    expect(hardNavigate).toHaveBeenCalledWith('/app');
    expect(document.cookie).toContain('active_team=team-harness');
    expect(JSON.parse(sessionStorage.getItem('teamFlash')!)).toEqual({
      tone: 'error',
      message: "You're no longer a member of Acme Mobility.",
    });
  });

  it("never reports a removal from the user's own team", async () => {
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-harness'));
    act(() => api.reportRemoved());
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it('re-checks the teams when the tab becomes visible again', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: true,
      data: { teams: [PERSONAL] },
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
  });

  it('reports a removal when any team query fails with NOT_A_MEMBER', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    // Team-scoped queries run once the active team is known, as in the app.
    const Failing = () => {
      const { isLoading } = useTeam();
      useQuery({
        queryKey: ['failing'],
        enabled: !isLoading,
        retry: false,
        queryFn: async () => {
          throw new TeamApiError(403, 'NOT_A_MEMBER', 'Not a member');
        },
      });
      return <Probe />;
    };
    renderProvider(<Failing />);
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
  });

  it('switchTeam sets the cookie, tracks it and reloads into Home', async () => {
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    act(() => api.switchTeam('team-acme'));
    expect(document.cookie).toContain('active_team=team-acme');
    expect(trackEvent).toHaveBeenCalledWith('Team Switched', {
      teamId: 'team-acme',
      via: 'switcher',
    });
    expect(hardNavigate).toHaveBeenCalledWith('/app');
  });

  it('shows the flash left by the previous page, in its tone', async () => {
    sessionStorage.setItem(
      'teamFlash',
      JSON.stringify({ tone: 'error', message: 'Gone' }),
    );
    renderProvider();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Gone'));
    expect(sessionStorage.getItem('teamFlash')).toBeNull();
  });
});
