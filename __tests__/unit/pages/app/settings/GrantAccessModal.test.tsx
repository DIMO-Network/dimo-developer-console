import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetSigners = jest.fn();
jest.mock('@/hooks/useSetLicenseSigners', () => ({
  useSetLicenseSigners: () => mockSetSigners,
}));
jest.mock('@/actions/teams', () => ({ upsertLicenseSigner: jest.fn() }));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { upsertLicenseSigner } from '@/actions/teams';
import { toast } from 'sonner';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { GrantAccessModal } from '@/app/settings/components/Team/GrantAccessModal';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: SIGNER,
  memberKeys: [{ licenseTokenId: 42, signerAddress: SIGNER }],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES: TeamLicense[] = [
  {
    tokenId: 42,
    clientId: '0xaaa',
    label: 'Harness Fleet',
    redirectUri: 'https://x',
    signers: [SIGNER.toLowerCase()],
  },
  {
    tokenId: 43,
    clientId: '0xbbb',
    label: 'Harness Labs',
    redirectUri: 'https://y',
    signers: [],
  },
  {
    tokenId: 44,
    clientId: '0xccc',
    label: 'Harness Pilot',
    redirectUri: 'https://z',
    signers: [SIGNER.toLowerCase()],
  },
  {
    tokenId: 45,
    clientId: '0xddd',
    label: 'No Redirect',
    redirectUri: null,
    signers: [],
  },
];
const setLoadingStatus = jest.fn();
const clearLoadingStatus = jest.fn();
const onClose = jest.fn();
const onGranted = jest.fn();
const open = () =>
  render(
    <LoadingStatusContext.Provider value={{ setLoadingStatus, clearLoadingStatus }}>
      <GrantAccessModal
        member={SAM}
        licenses={LICENSES}
        onClose={onClose}
        onGranted={onGranted}
      />
    </LoadingStatusContext.Provider>,
  );
const choose = (label: string) =>
  fireEvent.click(screen.getByRole('checkbox', { name: label }));
const grant = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Grant data access' }));
const recorded = { ok: true, data: { signer: {} } };

describe('GrantAccessModal', () => {
  beforeEach(() => {
    mockSetSigners.mockReset().mockResolvedValue(undefined);
    (upsertLicenseSigner as jest.Mock).mockReset().mockResolvedValue(recorded);
  });

  it('offers only licenses with a redirect URI where the wallet has no recorded key', () => {
    open();
    expect(screen.getAllByRole('checkbox').map((c) => c.id)).toEqual([
      'grant-43',
      'grant-44',
    ]);
  });

  it('shows the C8 warning for the chosen licenses', () => {
    open();
    choose('Harness Labs');
    expect(
      screen.getByText(
        "Data access lets Sam Rivera use every permission vehicles have granted Harness Labs, including commands, through the DIMO APIs — not only what the console shows. Their queries spend Harness Labs's DCX credits.",
      ),
    ).toBeInTheDocument();
  });

  it('enables on-chain in one transaction, then records each key, then tracks it', async () => {
    open();
    choose('Harness Labs');
    choose('Harness Pilot');
    grant();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // 44 is listed on-chain already (its registry write failed earlier); it is
    // enabled again anyway, since Identity's list can trail the chain.
    expect(mockSetSigners).toHaveBeenCalledWith('enableSigner', [
      { tokenId: 43, signer: SIGNER },
      { tokenId: 44, signer: SIGNER },
    ]);
    expect(upsertLicenseSigner).toHaveBeenCalledWith(43, SIGNER, {
      kind: 'MEMBER',
      holders: [{ userId: 'u-sam' }],
    });
    expect(upsertLicenseSigner).toHaveBeenCalledWith(44, SIGNER, {
      kind: 'MEMBER',
      holders: [{ userId: 'u-sam' }],
    });
    expect(mockSetSigners.mock.invocationCallOrder[0]).toBeLessThan(
      (upsertLicenseSigner as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(trackEvent).toHaveBeenCalledWith('Data Access Granted', {
      memberId: 'm-sam',
      tokenIds: [43, 44],
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Sam Rivera now has data access to Harness Labs and Harness Pilot.',
    );
    expect(onGranted).toHaveBeenCalled();
  });

  it('reports a denied transaction and records nothing', async () => {
    mockSetSigners.mockRejectedValue({ code: 4001 });
    open();
    choose('Harness Labs');
    grant();
    await waitFor(() =>
      expect(setLoadingStatus).toHaveBeenLastCalledWith({
        status: 'error',
        label: 'The transaction was denied',
      }),
    );
    expect(upsertLicenseSigner).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the grant when recording rejects twice, and retries only the registry', async () => {
    (upsertLicenseSigner as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'));
    open();
    choose('Harness Labs');
    grant();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Data access is on, but we couldn't record it for Harness Labs, so Sam Rivera can't use it yet.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockSetSigners).toHaveBeenCalledTimes(1);
    expect(upsertLicenseSigner).toHaveBeenCalledTimes(3);
  });

  it("shows console-api's refusal, disables the refused key again and offers no retry for a 4xx", async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      code: 'SIGNER_MISMATCH',
      message: "This address isn't the member's verified wallet.",
    });
    open();
    choose('Harness Labs');
    grant();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Harness Labs: This address isn't the member's verified wallet.",
    );
    expect(mockSetSigners).toHaveBeenLastCalledWith('disableSigner', [
      { tokenId: 43, signer: SIGNER },
    ]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Sam Rivera doesn't have data access to Harness Labs.",
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(upsertLicenseSigner).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('says the key is still enabled when disabling a refused key fails', async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      code: 'INVALID_HOLDERS',
      message: 'They are no longer on this team.',
    });
    mockSetSigners.mockResolvedValueOnce(undefined).mockRejectedValueOnce({ code: 4001 });
    open();
    choose('Harness Labs');
    grant();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Those keys are still enabled on-chain and nothing lists them. Delete them under API keys on the Config tab of Harness Labs.',
    );
  });

  it('cannot be closed while the transaction is pending', async () => {
    mockSetSigners.mockReturnValue(new Promise(() => {}));
    open();
    expect(screen.getByText('Close')).toBeInTheDocument();
    choose('Harness Labs');
    grant();
    await waitFor(() => expect(screen.queryByText('Close')).toBeNull());
  });
});
