import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetSigners = jest.fn();
jest.mock('@/hooks/useSetLicenseSigners', () => ({
  useSetLicenseSigners: () => mockSetSigners,
}));
jest.mock('@/actions/teams', () => ({
  markLicenseSignerDisabled: jest.fn(),
  removeTeamMember: jest.fn(),
  upsertLicenseSigner: jest.fn(),
}));
jest.mock('@/app/settings/components/Team/WebhookReview', () => ({
  WebhookReview: () => <div>webhook review</div>,
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import {
  markLicenseSignerDisabled,
  removeTeamMember,
  upsertLicenseSigner,
} from '@/actions/teams';
import { toast } from 'sonner';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { RemoveMemberModal } from '@/app/settings/components/Team/RemoveMemberModal';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: CURRENT,
  memberKeys: [
    { licenseTokenId: 42, signerAddress: CURRENT },
    { licenseTokenId: 43, signerAddress: OLD },
  ],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES: TeamLicense[] = [
  {
    tokenId: 42,
    clientId: '0xaaa',
    label: 'Harness Fleet',
    redirectUri: 'https://x',
    signers: [CURRENT.toLowerCase()],
  },
  {
    tokenId: 43,
    clientId: '0xbbb',
    label: 'Harness Labs',
    redirectUri: 'https://y',
    signers: [],
  },
];
const setLoadingStatus = jest.fn();
const onClose = jest.fn();
const onDone = jest.fn();
const remove = () => {
  render(
    <LoadingStatusContext.Provider
      value={{ setLoadingStatus, clearLoadingStatus: jest.fn() }}
    >
      <RemoveMemberModal
        member={SAM}
        licenses={LICENSES}
        teamName="Harness Motors"
        onClose={onClose}
        onDone={onDone}
      />
    </LoadingStatusContext.Provider>,
  );
  expect(screen.getByText('webhook review')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove from team' }));
};

describe('RemoveMemberModal', () => {
  beforeEach(() => {
    mockSetSigners.mockReset().mockResolvedValue(undefined);
    (markLicenseSignerDisabled as jest.Mock)
      .mockReset()
      .mockResolvedValue({ ok: true, data: {} });
    (removeTeamMember as jest.Mock)
      .mockReset()
      .mockResolvedValue({ ok: true, data: null });
  });

  it('revokes on-chain, stamps every key including the old wallet, removes and tracks', async () => {
    remove();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Sam Rivera was removed from Harness Motors.',
      ),
    );
    // 43 (the old wallet) is no longer listed, but Identity can trail the chain.
    expect(mockSetSigners).toHaveBeenCalledWith('disableSigner', [
      { tokenId: 42, signer: CURRENT },
      { tokenId: 43, signer: OLD },
    ]);
    expect(markLicenseSignerDisabled).toHaveBeenCalledWith(42, CURRENT);
    expect(markLicenseSignerDisabled).toHaveBeenCalledWith(43, OLD);
    expect(removeTeamMember).toHaveBeenCalledWith('m-sam');
    expect(trackEvent).toHaveBeenCalledWith('Data Access Revoked', {
      memberId: 'm-sam',
      tokenIds: [42, 43],
    });
    expect(trackEvent).toHaveBeenCalledWith('Team Member Removed', { memberId: 'm-sam' });
    expect(onClose).toHaveBeenCalled();
  });

  it('still removes the membership when the transaction is denied, leaving the key to Retry', async () => {
    mockSetSigners.mockRejectedValue({ code: 4001 });
    remove();
    await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('m-sam'));
    expect(setLoadingStatus).toHaveBeenLastCalledWith({
      status: 'error',
      label: 'The transaction was denied',
    });
    expect(markLicenseSignerDisabled).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      'Sam Rivera was removed, but is still a signer on Harness Fleet and Harness Labs. Use Retry on their row.',
    );
    expect(trackEvent).not.toHaveBeenCalledWith('Data Access Revoked', expect.anything());
  });

  const removeUnrecorded = () => {
    render(
      <LoadingStatusContext.Provider
        value={{ setLoadingStatus, clearLoadingStatus: jest.fn() }}
      >
        <RemoveMemberModal
          member={{ ...SAM, memberKeys: [] }}
          licenses={LICENSES}
          teamName="Harness Motors"
          onClose={onClose}
          onDone={onDone}
        />
      </LoadingStatusContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove from team' }));
  };

  it('records an unrecorded key it could not disable, then removes the member', async () => {
    mockSetSigners.mockRejectedValue({ code: 4001 });
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    removeUnrecorded();
    await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('m-sam'));
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, CURRENT, {
      kind: 'MEMBER',
      holders: [{ userId: 'u-sam' }],
    });
    expect((upsertLicenseSigner as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (removeTeamMember as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Sam Rivera was removed, but is still a signer on Harness Fleet. Use Retry on their row.',
    );
  });

  it('keeps a member whose unrecorded key could be neither disabled nor recorded', async () => {
    mockSetSigners.mockRejectedValue({ code: 4001 });
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: null,
      message: 'x',
    });
    removeUnrecorded();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Sam Rivera is still on Harness Motors: we couldn't remove their wallet from Harness Fleet on-chain. Try again.",
      ),
    );
    expect(removeTeamMember).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('still removes when a stamp fails twice, and says how to finish', async () => {
    (markLicenseSignerDisabled as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'));
    remove();
    await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('m-sam'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't record the revoked access for Harness Fleet. Use Retry on their row to finish.",
      ),
    );
  });
});
