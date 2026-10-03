import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetSigners = jest.fn();
jest.mock('@/hooks/useSetLicenseSigners', () => ({
  useSetLicenseSigners: () => mockSetSigners,
}));
jest.mock('@/actions/teams', () => ({ markLicenseSignerDisabled: jest.fn() }));
jest.mock('@/app/settings/components/Team/WebhookReview', () => ({
  WebhookReview: () => <div>webhook review</div>,
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { markLicenseSignerDisabled } from '@/actions/teams';
import { toast } from 'sonner';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { RevokeAccessModal } from '@/app/settings/components/Team/RevokeAccessModal';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const LEO: TeamMember = {
  id: 'm-leo',
  userId: 'u-leo',
  name: 'Leo Park',
  email: 'leo@harness.dev',
  role: 'MEMBER',
  status: 'LEFT',
  signerAddress: CURRENT,
  memberKeys: [{ licenseTokenId: 42, signerAddress: CURRENT }],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES = [
  {
    tokenId: 42,
    clientId: '0xaaa',
    label: 'Harness Fleet',
    redirectUri: 'https://x',
    signers: [CURRENT.toLowerCase()],
  },
];

describe('RevokeAccessModal', () => {
  it('revokes the chosen licenses, and retries only the registry stamp when it failed', async () => {
    mockSetSigners.mockResolvedValue(undefined);
    const unavailable = {
      ok: false,
      status: 502,
      code: 'IDENTITY_UNAVAILABLE',
      message: 'x',
    };
    (markLicenseSignerDisabled as jest.Mock)
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce({ ok: true, data: {} });
    const onClose = jest.fn();
    render(
      <LoadingStatusContext.Provider
        value={{ setLoadingStatus: jest.fn(), clearLoadingStatus: jest.fn() }}
      >
        <RevokeAccessModal
          member={LEO}
          licenses={LICENSES}
          onClose={onClose}
          onDone={jest.fn()}
        />
      </LoadingStatusContext.Provider>,
    );
    expect(screen.getByRole('checkbox', { name: 'Harness Fleet' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke data access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Data access is off, but we couldn't record that for Harness Fleet.",
    );
    expect(trackEvent).toHaveBeenCalledWith('Data Access Revoked', {
      memberId: 'm-leo',
      tokenIds: [42],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Leo Park's data access is revoked."),
    );
    expect(mockSetSigners).toHaveBeenCalledTimes(1);
    expect(markLicenseSignerDisabled).toHaveBeenCalledTimes(3);
    expect(onClose).toHaveBeenCalled();
  });
});
