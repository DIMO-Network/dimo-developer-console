import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/invites', () => ({
  previewPendingInvite: jest.fn(),
  acceptPendingInvite: jest.fn(),
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { acceptPendingInvite, previewPendingInvite } from '@/actions/invites';
import { toast } from 'sonner';
import { PendingInvite } from '@/components/PendingInvite';

const PREVIEW = {
  teamName: 'Acme Mobility',
  ownerEmail: 'ops@acme.dev',
  expiresAt: '2026-10-09T00:00:00Z',
};
const TEAM = {
  id: 'team-joined',
  name: 'Acme Mobility',
  companyName: 'Acme Mobility',
  role: 'MEMBER',
  ownerUserId: 'u',
  ownerEmail: 'ops@acme.dev',
  ownerAddress: '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a',
  isPersonal: false,
};

const renderInvite = (onJoined = jest.fn(), client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <PendingInvite onJoined={onJoined} />
    </QueryClientProvider>,
  );

// Resolves once the component has handled preview call n (0-based): its
// continuation was queued on the same promise before ours.
const previewHandled = async (n: number) => {
  await waitFor(() => expect(previewPendingInvite).toHaveBeenCalledTimes(n + 1));
  await act(async () => {
    await (previewPendingInvite as jest.Mock).mock.results[n].value;
  });
};

describe('PendingInvite', () => {
  it('renders nothing without a pending invite', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue(null);
    const { container } = renderInvite();
    await previewHandled(0);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not ask again on the next section once there was no invite', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue(null);
    const client = new QueryClient();
    const { unmount } = renderInvite(jest.fn(), client);
    await previewHandled(0);
    unmount();
    renderInvite(jest.fn(), client);
    await act(async () => {});
    expect(previewPendingInvite).toHaveBeenCalledTimes(1);
  });

  it('asks before joining and hands the accepted team (MEMBER, not personal) to onJoined', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue({ ok: true, data: PREVIEW });
    (acceptPendingInvite as jest.Mock).mockResolvedValue({
      ok: true,
      data: { team: TEAM },
    });
    const onJoined = jest.fn();
    renderInvite(onJoined);
    expect(
      await screen.findByText('Join Acme Mobility owned by ops@acme.dev?'),
    ).toBeInTheDocument();
    expect(acceptPendingInvite).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Join team' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(TEAM));
    expect(onJoined.mock.calls[0][0]).toMatchObject({
      id: 'team-joined',
      role: 'MEMBER',
      isPersonal: false,
    });
    expect(trackEvent).toHaveBeenCalledWith('Team Invite Accepted', {
      teamId: 'team-joined',
    });
  });

  it('closes on "Not now" without accepting', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue({ ok: true, data: PREVIEW });
    renderInvite();
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Join Acme Mobility owned by ops@acme.dev?')).toBeNull();
    expect(acceptPendingInvite).not.toHaveBeenCalled();
  });

  it('explains a terminal error and stays quiet on a network failure', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: 'INVITE_EMAIL_MISMATCH',
      message: 'x',
    });
    const { unmount } = renderInvite();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'This invite was sent to a different email address. Sign in with that address to accept it.',
      ),
    );
    unmount();
    (toast.error as jest.Mock).mockClear();
    (previewPendingInvite as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 0,
      code: null,
      message: 'x',
    });
    renderInvite();
    await previewHandled(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
