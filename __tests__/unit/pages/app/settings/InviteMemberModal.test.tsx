import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/actions/teams', () => ({ inviteTeamMember: jest.fn() }));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
import { inviteTeamMember } from '@/actions/teams';
import { toast } from 'sonner';
import { InviteMemberModal } from '@/app/settings/components/Team/InviteMemberModal';

const onInvited = jest.fn();
const onClose = jest.fn();
const invite = async (email = 'sam@harness.dev') => {
  render(
    <InviteMemberModal
      isOpen
      onClose={onClose}
      teamId="team-harness"
      onInvited={onInvited}
    />,
  );
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
};
const refuse = (status: number, code: string, message: string) =>
  (inviteTeamMember as jest.Mock).mockResolvedValue({ ok: false, status, code, message });

describe('InviteMemberModal', () => {
  it('sends the invite, adds the row, tracks it and confirms', async () => {
    const member = { id: 'm-sam', email: 'sam@harness.dev' };
    (inviteTeamMember as jest.Mock).mockResolvedValue({ ok: true, data: { member } });
    await invite();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invite sent to sam@harness.dev'),
    );
    expect(inviteTeamMember).toHaveBeenCalledWith('sam@harness.dev');
    expect(onInvited).toHaveBeenCalledWith(member);
    expect(trackEvent).toHaveBeenCalledWith('Team Invite Sent', {
      teamId: 'team-harness',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('explains an email that could not be sent', async () => {
    refuse(502, 'EMAIL_FAILED', 'Email failed');
    await invite();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't email sam@harness.dev. Try again.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows console-api's message for rate limits and an unfinished team", async () => {
    refuse(
      429,
      'RATE_LIMITED',
      'This team has sent 10 invitations in the last hour. Try again later.',
    );
    await invite();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This team has sent 10 invitations in the last hour. Try again later.',
    );
  });

  it('shows Finish setting up your team first for NOT_A_MEMBER', async () => {
    refuse(403, 'NOT_A_MEMBER', 'Finish setting up your team first');
    await invite();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Finish setting up your team first',
    );
  });
});
