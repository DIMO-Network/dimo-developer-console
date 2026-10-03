import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/actions/teams', () => ({ leaveTeam: jest.fn() }));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const reportRemoved = jest.fn();
const flashAfterReload = jest.fn();
const ACME = {
  id: 'team-acme',
  name: 'Acme Mobility',
  role: 'MEMBER',
  ownerEmail: 'ops@acme.dev',
  isPersonal: false,
};
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({
    activeTeam: ACME,
    teams: [{ id: 'team-harness', isPersonal: true }, ACME],
    reportRemoved,
    flashAfterReload,
  }),
}));
import { leaveTeam } from '@/actions/teams';
import { hardNavigate } from '@/utils/hardNavigate';
import { LeaveTeam } from '@/app/settings/components/Team/LeaveTeam';

const confirmLeaving = () => {
  render(<LeaveTeam />);
  fireEvent.click(screen.getByRole('button', { name: 'Leave team' }));
  expect(
    screen.getByText(
      'Leave Acme Mobility? ops@acme.dev will be asked to revoke your data access.',
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
};

describe('LeaveTeam', () => {
  beforeEach(() => {
    document.cookie = 'active_team=team-acme; Path=/';
  });

  it('leaves, tracks it and reloads into the personal team', async () => {
    (leaveTeam as jest.Mock).mockResolvedValue({ ok: true, data: null });
    confirmLeaving();
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(document.cookie).toContain('active_team=team-harness');
    expect(trackEvent).toHaveBeenCalledWith('Team Left', { teamId: 'team-acme' });
    expect(flashAfterReload).toHaveBeenCalledWith({
      tone: 'success',
      message: 'You left Acme Mobility.',
    });
  });

  it('treats NOT_A_MEMBER as already removed', async () => {
    (leaveTeam as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'x',
    });
    confirmLeaving();
    await waitFor(() => expect(reportRemoved).toHaveBeenCalled());
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
