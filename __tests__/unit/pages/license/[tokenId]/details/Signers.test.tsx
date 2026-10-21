import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const enableSigner = jest.fn(async () => {});
const disableSigner = jest.fn(async () => {});
const trackEvent = jest.fn();
// The @/hooks barrel pulls Turnkey and ZeroDev; Signers only needs these.
jest.mock('@/hooks', () => ({
  useDimoAuth: () => ({
    hasGlobalAccountPrivateKey: async () => ({ hasPrivateKey: false }),
  }),
  useDisableSigner: () => disableSigner,
  useEnableSigner: () => enableSigner,
  useEventEmitter: () => ({ publishEvent: jest.fn() }),
  useGlobalAccount: () => ({
    currentUser: {
      smartContractAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
      walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    },
  }),
  useMixPanel: () => ({ trackEvent }),
  useSetRedirectUri: () => jest.fn(),
}));
jest.mock('@/hoc', () => ({
  withLoadingStatus: jest.requireActual('@/hoc/withLoadingStatus').withLoadingStatus,
}));
jest.mock('@/hooks/useIsLicenseOwner', () => ({ useIsLicenseOwner: jest.fn() }));
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
const SAM_ROW = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null as string | null,
};
const mockTeam = { members: [SAM_ROW] };
jest.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => mockTeam }));
const registry = { byAddress: new Map(), isError: false, refetch: jest.fn() };
jest.mock('@/hooks/useLicenseSignerRegistry', () => ({
  useLicenseSignerRegistry: () => registry,
}));
jest.mock('@/actions/teams', () => ({
  upsertLicenseSigner: jest.fn(),
  markLicenseSignerDisabled: jest.fn(),
}));
jest.mock('@/actions/user', () => ({ getUser: jest.fn() }));
jest.mock('@/services/dimoDev', () => ({ getDeveloperJwt: jest.fn() }));
jest.mock('@/utils/wallet', () => ({
  generateWallet: () => ({
    address: '0xa11cE0000000000000000000000000000000Beef',
    privateKey: '0xabc123',
  }),
}));
jest.mock(
  '@/app/license/[tokenId]/details/components/Signers/components/APIKeyModal',
  () => ({
    APIKeyModal: ({ isOpen, apiKey }: { isOpen: boolean; apiKey: string }) =>
      isOpen ? <p>{`API key ${apiKey}`}</p> : null,
  }),
);
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import { getUser } from '@/actions/user';
import { getDeveloperJwt } from '@/services/dimoDev';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers/Signers';

const NEW_KEY = '0xa11cE0000000000000000000000000000000Beef';
const SIGNER = '0x5b2E4F6A8C0D2e4f6A8C0D2e4f6a8c0D2e4F6a8c';
const SAM_WALLET = '0x1c3E5A7b9D0F2a4c6E8b0D1F3a5c7e9B2D4f6a8C';
const UNASSIGNED = '0x2D4f6a8C1c3E5a7b9D0F2A4c6E8B0D1F3A5c7e9b';
const OLD = '0x3a5C7e9b2d4F6a8c1c3E5A7B9d0F2a4c6E8B0D1f';
const row = (
  signerAddress: string,
  kind: string,
  holders: object[],
  note: string | null = null,
) => ({
  signerAddress,
  kind,
  note,
  holders,
  createdAt: '2026-09-01T00:00:00Z',
  createdBy: 'user-harness',
  disabledAt: null,
  disabledBy: null,
});
const show = (signers: string[] = []) =>
  render(
    <Signers
      license={
        {
          owner: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
          clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
          tokenId: 42,
          signers: {
            nodes: signers.map((address) => ({
              address,
              enabledAt: '2026-09-01T00:00:00Z',
            })),
          },
          redirectURIs: { nodes: [{ uri: 'https://rentals.dimo.co/' }] },
        } as never
      }
      refetch={jest.fn(async () => {})}
    />,
  );

describe('Signers', () => {
  beforeEach(() => {
    registry.byAddress = new Map();
    mockTeam.members = [SAM_ROW];
    (useIsLicenseOwner as jest.Mock).mockReturnValue(true);
    (upsertLicenseSigner as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('asks who a new key is for, shows it once enabled, and offers Assign with the holders filled in', async () => {
    (upsertLicenseSigner as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Generate key' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sam Rivera' }));
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Prod backend' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));
    expect(await screen.findByText('API key abc123')).toBeInTheDocument();
    expect(enableSigner).toHaveBeenCalledWith(NEW_KEY);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "The key works, but we couldn't record who it's for.",
        {
          action: expect.objectContaining({ label: 'Assign' }),
        },
      ),
    );
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, NEW_KEY, {
      kind: 'API_KEY',
      holders: [{ userId: 'u-sam' }],
      note: 'Prod backend',
    });
    const [, options] = (toast.error as jest.Mock).mock.calls[0];
    act(() => options.action.onClick());
    expect(screen.getByRole('checkbox', { name: 'Sam Rivera' })).toBeChecked();
    expect(screen.getByLabelText('Note')).toHaveValue('Prod backend');
  });

  it('records a RentalOS key, and a registry failure never rolls the tenant back', async () => {
    jest.useFakeTimers();
    (upsertLicenseSigner as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    (getDeveloperJwt as jest.Mock).mockResolvedValue({
      headers: { Authorization: 'Bearer dev.jwt' },
    });
    (getUser as jest.Mock).mockResolvedValue({
      name: 'Jane Developer',
      email: 'jane@harness.dev',
    });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'ok',
    })) as never;
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Register RentalOS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    await waitFor(() =>
      expect(upsertLicenseSigner).toHaveBeenCalledWith(42, NEW_KEY, {
        kind: 'API_KEY',
        holders: [{ name: 'RentalOS' }],
        note: 'RentalOS',
      }),
    );
    expect(disableSigner).not.toHaveBeenCalled();
    expect(screen.getByText('API key abc123')).toBeInTheDocument();
  });

  it("shows who each key belongs to, and leaves a member's key to Settings → Team", async () => {
    registry.byAddress = new Map([
      [
        SIGNER.toLowerCase(),
        row(
          SIGNER,
          'API_KEY',
          [{ userId: null, name: 'Ops on-call', email: null }],
          'Pager duty',
        ),
      ],
      [
        SAM_WALLET.toLowerCase(),
        row(SAM_WALLET, 'MEMBER', [
          { userId: 'u-sam', name: 'Sam Rivera', email: 'sam@harness.dev' },
        ]),
      ],
      [
        OLD.toLowerCase(),
        row(OLD, 'EXTERNAL', [{ userId: null, name: 'Old backend', email: null }]),
      ],
    ]);
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: true,
      data: { signer: {} },
    });
    show([SIGNER, SAM_WALLET, UNASSIGNED]);
    expect(screen.getByText('Pager duty')).toBeInTheDocument();
    expect(screen.getByText('sam@harness.dev')).toBeInTheDocument();
    expect(screen.getByText('Disabled outside the console')).toBeInTheDocument();
    expect(screen.getByText(/Unassigned/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: `Actions for ${SAM_WALLET}` }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${SIGNER}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Assign' }));
    expect(screen.getByLabelText('Other people (comma-separated)')).toHaveValue(
      'Ops on-call',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(trackEvent).toHaveBeenCalledWith('API Key Assigned', {
        tokenId: 42,
        signerAddress: SIGNER,
        holders: 1,
      }),
    );
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, SIGNER, {
      kind: 'API_KEY',
      holders: [{ name: 'Ops on-call' }],
      note: 'Pager duty',
    });
  });

  it('assigns an unregistered key as EXTERNAL', async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: true,
      data: { signer: {} },
    });
    show([UNASSIGNED]);
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    fireEvent.change(screen.getByLabelText('Other people (comma-separated)'), {
      target: { value: 'Data team' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(upsertLicenseSigner).toHaveBeenCalledWith(42, UNASSIGNED, {
        kind: 'EXTERNAL',
        holders: [{ name: 'Data team' }],
        note: null,
      }),
    );
  });

  it("never offers Assign or actions on a team member's wallet", () => {
    mockTeam.members = [{ ...SAM_ROW, signerAddress: SAM_WALLET }];
    show([SAM_WALLET]);
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: `Actions for ${SAM_WALLET}` }),
    ).toBeNull();
  });

  it("offers only Delete on the owner's own console wallet", () => {
    const JANE_WALLET = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
    mockTeam.members = [
      {
        ...SAM_ROW,
        id: 'm-jane',
        userId: 'u-jane',
        name: 'Jane Developer',
        email: 'jane@harness.dev',
        role: 'OWNER',
        signerAddress: JANE_WALLET,
      },
    ];
    show([JANE_WALLET]);
    expect(screen.getByText('Console wallet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${JANE_WALLET}` }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Delete API key',
    ]);
  });

  it('explains SIGNER_IN_USE when Assign meets a member wallet the list did not know', async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      code: 'SIGNER_IN_USE',
      message: 'x',
    });
    show([UNASSIGNED]);
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    fireEvent.change(screen.getByLabelText('Other people (comma-separated)'), {
      target: { value: 'Data team' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This address is a team member's wallet. Record it with Grant in Settings → Team.",
    );
  });

  it('stamps the registry when an API key is deleted', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    show([SIGNER]);
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${SIGNER}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete API key' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(markLicenseSignerDisabled).toHaveBeenCalledWith(42, SIGNER),
    );
    expect(disableSigner).toHaveBeenCalledWith(SIGNER);
  });

  it('is read-only for members', () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    show([SIGNER]);
    expect(screen.queryByRole('button', { name: 'Generate key' })).toBeNull();
    expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  });
});
