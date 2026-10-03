import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: jest.fn() }));
jest.mock('@/hooks/useTeamLicenses', () => ({ useTeamLicenses: jest.fn() }));
jest.mock('@/actions/teams', () => ({
  resendTeamInvite: jest.fn(),
  cancelTeamInvite: jest.fn(),
  inviteTeamMember: jest.fn(),
  leaveTeam: jest.fn(),
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Mutable test state lives in a holder (Global Constraints, Commits).
const mockFlags = { dataAccess: true };
jest.mock('@/utils/featureFlags', () => ({
  TEMPLATE_EDITOR_ENABLED: false,
  get TEAM_DATA_ACCESS_ENABLED() {
    return mockFlags.dataAccess;
  },
}));
jest.mock('@/hooks/useSetLicenseSigners', () => ({
  useSetLicenseSigners: () => jest.fn(),
}));
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import { resendTeamInvite } from '@/actions/teams';
import { toast } from 'sonner';
import { TeamSection } from '@/app/settings/components/Team';
import type { TeamMember } from '@/types/team';

const OWNER_ROW: TeamMember = {
  id: 'm-owner',
  userId: 'u-jane',
  name: 'Jane Harness',
  email: 'jane@harness.dev',
  role: 'OWNER',
  status: 'ACCEPTED',
  signerAddress: null,
  memberKeys: [],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const ANA: TeamMember = {
  ...OWNER_ROW,
  id: 'm-ana',
  userId: null,
  name: null,
  email: 'ana@harness.dev',
  role: 'MEMBER',
  status: 'PENDING',
  inviteExpiresAt: '2099-01-01T00:00:00Z',
};
const HARNESS = {
  id: 'team-harness',
  name: 'Harness Motors',
  role: 'OWNER',
  isPersonal: true,
  ownerEmail: 'jane@harness.dev',
};
const ACME = {
  id: 'team-acme',
  name: 'Acme Mobility',
  role: 'MEMBER',
  isPersonal: false,
  ownerEmail: 'ops@acme.dev',
};
const members = (over: Partial<ReturnType<typeof useTeamMembers>>) =>
  (useTeamMembers as jest.Mock).mockReturnValue({
    members: [OWNER_ROW, ANA],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    upsertMember: jest.fn(),
    ...over,
  });
const asOwner = () =>
  (useTeam as jest.Mock).mockReturnValue({
    activeTeam: HARNESS,
    teams: [HARNESS],
    isOwner: true,
    isMember: false,
    isLoading: false,
    reportRemoved: jest.fn(),
    flashAfterReload: jest.fn(),
  });

describe('TeamSection', () => {
  beforeEach(() => {
    asOwner();
    members({});
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [],
      loading: false,
      refetch: jest.fn(),
    });
  });

  it('shows a loader while the members load', () => {
    members({ members: [], isLoading: true });
    const { container } = render(<TeamSection />);
    expect(container.querySelector('.loader')).not.toBeNull();
  });

  it('shows an error with a retry', () => {
    const refetch = jest.fn();
    members({ members: [], isError: true, refetch });
    render(<TeamSection />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your team.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it("says when the team's licenses can't load, and loads them again", () => {
    const refetchLicenses = jest.fn();
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [],
      loading: false,
      error: new Error('Identity down'),
      refetch: refetchLicenses,
    });
    render(<TeamSection />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't load this team's licenses, so data access can't be changed right now.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load licenses again' }));
    expect(refetchLicenses).toHaveBeenCalled();
  });

  it('invites the first teammate from the empty state', () => {
    members({ members: [OWNER_ROW] });
    render(<TeamSection />);
    expect(screen.getByText(/Invite teammates to share this team/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument();
  });

  it('resends an invite and tracks it', async () => {
    (resendTeamInvite as jest.Mock).mockResolvedValue({
      ok: true,
      data: { member: ANA },
    });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for ana@harness.dev' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Resend' }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invite resent to ana@harness.dev'),
    );
    expect(resendTeamInvite).toHaveBeenCalledWith('m-ana');
    expect(trackEvent).toHaveBeenCalledWith('Team Invite Resent', {
      teamId: 'team-harness',
    });
  });

  it('shows members the team without invite or row actions, and lets them leave', () => {
    (useTeam as jest.Mock).mockReturnValue({
      activeTeam: ACME,
      teams: [HARNESS, ACME],
      isOwner: false,
      isMember: true,
      isLoading: false,
      reportRemoved: jest.fn(),
      flashAfterReload: jest.fn(),
    });
    render(<TeamSection />);
    // Title renders <h2 role="h2">, which has no accessible heading role.
    expect(screen.getByText('Acme Mobility', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite member' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Leave team' })).toBeInTheDocument();
  });

  const SAM: TeamMember = {
    ...OWNER_ROW,
    id: 'm-sam',
    userId: 'u-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    role: 'MEMBER',
    signerAddress: '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6',
  };
  const FLEET = {
    tokenId: 42,
    clientId: '0xaaa',
    label: 'Harness Fleet',
    redirectUri: 'https://x',
    signers: [],
  };

  it('opens Grant from the banner for a member who linked a wallet', () => {
    members({ members: [OWNER_ROW, SAM] });
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [FLEET],
      loading: false,
      refetch: jest.fn(),
    });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    // Modal titles render through Title (<h2 role="h2">): no accessible heading role.
    expect(
      screen.getByText('Grant Sam Rivera data access', { selector: 'h2' }),
    ).toBeInTheDocument();
  });

  it('hides the banner while member data access is off (C5)', () => {
    mockFlags.dataAccess = false;
    members({ members: [OWNER_ROW, SAM] });
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [FLEET],
      loading: false,
      refetch: jest.fn(),
    });
    render(<TeamSection />);
    expect(screen.queryByRole('status')).toBeNull();
    mockFlags.dataAccess = true;
  });

  it('offers no Grant while the licenses fail to load', () => {
    members({ members: [OWNER_ROW, SAM] });
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [],
      loading: false,
      error: new Error('Identity down'),
      refetch: jest.fn(),
    });
    render(<TeamSection />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Grant' })).toBeNull();
  });
});
