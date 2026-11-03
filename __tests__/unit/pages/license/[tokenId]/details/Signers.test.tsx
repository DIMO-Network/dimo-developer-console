import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const enableSigner = jest.fn(async () => {});
const setRedirectUri = jest.fn(async () => {});
const disableSigner = jest.fn(async () => {});
const trackEvent = jest.fn();
const OWNER = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const CONSOLE_KEY = '0xC0n50Le00000000000000000000000000000Be3f';
const mockOwnerKey = {
  hasPrivateKey: true,
  privateKeyAddress: CONSOLE_KEY as string | null,
};
const hasGlobalAccountPrivateKey = jest.fn(async () => mockOwnerKey);
const findConsoleKeyAddress = jest.fn(async () => CONSOLE_KEY);
const getGlobalAccountDeveloperJwt = jest.fn();
const mockSetLoadingStatus = jest.fn();
const mockPublishEvent = jest.fn();
// The @/hooks barrel pulls Turnkey and ZeroDev; Signers only needs these.
jest.mock('@/hooks', () => ({
  useDimoAuth: () => ({
    hasGlobalAccountPrivateKey,
    findConsoleKeyAddress,
    getGlobalAccountDeveloperJwt,
  }),
  useDisableSigner: () => disableSigner,
  useEnableSigner: () => enableSigner,
  useEventEmitter: () => ({ publishEvent: mockPublishEvent }),
  useGlobalAccount: () => ({
    currentUser: {
      smartContractAddress: OWNER,
      subOrganizationId: 'sub-org',
      walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    },
  }),
  useMixPanel: () => ({ trackEvent }),
  useSetRedirectUri: () => setRedirectUri,
}));
jest.mock('@/hoc', () => ({
  withLoadingStatus: (Component: React.ComponentType) => Component,
}));
jest.mock('@/context/LoadingStatusContext', () => {
  const { createContext } = jest.requireActual('react');
  return {
    LoadingStatusContext: createContext({
      setLoadingStatus: (...a: unknown[]) => mockSetLoadingStatus(...a),
      clearLoadingStatus: jest.fn(),
    }),
  };
});
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
const registry = {
  byAddress: new Map(),
  isError: false,
  isLoaded: true,
  refetch: jest.fn(),
};
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
import {
  RedirectUriOverlayProvider,
  useRedirectUris,
} from '@/app/license/[tokenId]/details/components/redirectUriOverlay';

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
const refetchLicense = jest.fn(async () => {});
const OWNER_ROW = {
  ...SAM_ROW,
  id: 'm-jane',
  userId: 'u-jane',
  name: 'Jane Developer',
  email: 'jane@harness.dev',
  role: 'OWNER',
};
const show = (signers: string[] = [], owner = OWNER) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Signers
        license={
          {
            owner,
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
        refetch={refetchLicense}
      />
    </QueryClientProvider>,
  );

describe('Signers', () => {
  beforeEach(() => {
    registry.byAddress = new Map();
    mockTeam.members = [SAM_ROW];
    (useIsLicenseOwner as jest.Mock).mockReturnValue(true);
    (upsertLicenseSigner as jest.Mock).mockReset();
    registry.refetch.mockReset();
    mockOwnerKey.hasPrivateKey = true;
    mockOwnerKey.privateKeyAddress = CONSOLE_KEY;
    enableSigner.mockReset();
    enableSigner.mockResolvedValue(undefined);
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
  });
  afterEach(() => jest.useRealTimers());

  it('sends no transaction when the owner opens the tab', async () => {
    mockTeam.members = [OWNER_ROW];
    show();
    expect(
      await screen.findByText(/Console access lets this console/),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Enable console access' }),
    ).toBeEnabled();
    await waitFor(() => expect(findConsoleKeyAddress).toHaveBeenCalled());
    expect(enableSigner).not.toHaveBeenCalled();
    expect(hasGlobalAccountPrivateKey).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('sends exactly one transaction from the button', async () => {
    mockTeam.members = [OWNER_ROW];
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Enable console access' }));
    await waitFor(() =>
      expect(mockPublishEvent).toHaveBeenCalledWith({ client_id: CONSOLE_KEY }, true),
    );
    expect(enableSigner).toHaveBeenCalledTimes(1);
    expect(enableSigner).toHaveBeenCalledWith(CONSOLE_KEY);
    expect(refetchLicense).toHaveBeenCalled();
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, CONSOLE_KEY, {
      kind: 'API_KEY',
      note: 'Console',
      holders: [{ userId: 'u-jane' }],
    });
  });

  it('shows a member no button and triggers nothing', async () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    show([SIGNER]);
    expect(screen.queryByRole('button', { name: 'Enable console access' })).toBeNull();
    expect(
      screen.getByText("The license owner hasn't turned on console access yet."),
    ).toBeInTheDocument();
    await act(async () => {});
    expect(findConsoleKeyAddress).not.toHaveBeenCalled();
    expect(hasGlobalAccountPrivateKey).not.toHaveBeenCalled();
    expect(enableSigner).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('tells a member nothing once console access is on', () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    registry.byAddress = new Map([
      [
        SIGNER.toLowerCase(),
        row(
          SIGNER,
          'API_KEY',
          [{ userId: 'u-jane', name: 'Jane', email: null }],
          'Console',
        ),
      ],
    ]);
    show([SIGNER]);
    expect(screen.queryByText(/hasn't turned on console access/)).toBeNull();
  });

  it('labels the console key Console (you) with no Assign', async () => {
    registry.byAddress = new Map([
      [
        CONSOLE_KEY.toLowerCase(),
        row(
          CONSOLE_KEY,
          'API_KEY',
          [{ userId: 'u-jane', name: 'Jane', email: null }],
          'Console',
        ),
      ],
    ]);
    show([CONSOLE_KEY]);
    expect(await screen.findByText('Console (you)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
    expect(screen.queryByText(/Unassigned/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${CONSOLE_KEY}` }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Turn off console access',
    ]);
  });

  it('records the registry row for a key enabled before, without a transaction', async () => {
    mockTeam.members = [OWNER_ROW];
    show([CONSOLE_KEY.toLowerCase()]);
    await waitFor(() => expect(upsertLicenseSigner).toHaveBeenCalledTimes(1));
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, CONSOLE_KEY.toLowerCase(), {
      kind: 'API_KEY',
      note: 'Console',
      holders: [{ userId: 'u-jane' }],
    });
    expect(enableSigner).not.toHaveBeenCalled();
  });

  it('publishes the JWT event on open when console access is already on, with no transaction', async () => {
    mockTeam.members = [OWNER_ROW];
    show([CONSOLE_KEY.toLowerCase()]);
    await waitFor(() =>
      expect(mockPublishEvent).toHaveBeenCalledWith(
        { client_id: CONSOLE_KEY.toLowerCase() },
        true,
      ),
    );
    expect(mockPublishEvent).toHaveBeenCalledTimes(1);
    expect(enableSigner).not.toHaveBeenCalled();
  });

  it('publishes nothing on open when the console key is not a signer', async () => {
    mockTeam.members = [OWNER_ROW];
    show();
    await screen.findByRole('button', { name: 'Enable console access' });
    expect(mockPublishEvent).not.toHaveBeenCalled();
    expect(enableSigner).not.toHaveBeenCalled();
  });

  it('shows no Enable button while the console key is still being looked up', async () => {
    findConsoleKeyAddress.mockImplementationOnce(() => new Promise(() => {}));
    show();
    expect(await screen.findByText('Checking console access…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable console access' })).toBeNull();
  });

  it('keeps access on after an enable the license list has not caught up with', async () => {
    mockTeam.members = [OWNER_ROW];
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Enable console access' }));
    expect(await screen.findByText('Console (you)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable console access' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy JWT' })).toBeInTheDocument();
    expect(enableSigner).toHaveBeenCalledTimes(1);
  });

  it('keeps console access off after turning it off, without re-recording the row', async () => {
    mockTeam.members = [OWNER_ROW];
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    registry.byAddress = new Map([
      [
        CONSOLE_KEY.toLowerCase(),
        row(CONSOLE_KEY, 'API_KEY', [{ userId: 'u-jane' }], 'Console'),
      ],
    ]);
    registry.refetch.mockImplementation(() => {
      registry.byAddress = new Map();
    });
    show([CONSOLE_KEY.toLowerCase()]);
    await screen.findByText('Console (you)');
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Actions for ${CONSOLE_KEY.toLowerCase()}`,
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Turn off console access' }));
    expect(screen.getByText('Turn off console access?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(markLicenseSignerDisabled).toHaveBeenCalled());
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());
    await act(async () => {});
    expect(upsertLicenseSigner).not.toHaveBeenCalled();
  });

  // The turn-off transaction has confirmed but Identity still lists the key: Enable
  // must send a transaction, not read the stale list and only re-mark the row.
  it('sends a transaction when enabling right after turning access off', async () => {
    mockTeam.members = [OWNER_ROW];
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    show([CONSOLE_KEY.toLowerCase()]);
    await screen.findByText('Console (you)');
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Actions for ${CONSOLE_KEY.toLowerCase()}`,
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Turn off console access' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: 'Enable console access' }));

    await waitFor(() => expect(enableSigner).toHaveBeenCalledWith(CONSOLE_KEY));
    expect(enableSigner).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Copy JWT' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable console access' })).toBeNull();
  });

  it('records the console key row once the team members load after the registry', async () => {
    mockTeam.members = [];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const license = {
      owner: OWNER,
      clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
      tokenId: 42,
      signers: {
        nodes: [
          { address: CONSOLE_KEY.toLowerCase(), enabledAt: '2026-09-01T00:00:00Z' },
        ],
      },
      redirectURIs: { nodes: [{ uri: 'https://rentals.dimo.co/' }] },
    } as never;
    const page = () => (
      <QueryClientProvider client={client}>
        <Signers license={license} refetch={refetchLicense} />
      </QueryClientProvider>
    );
    const view = render(page());
    await screen.findByText('Console (you)');
    await act(async () => {});
    expect(upsertLicenseSigner).not.toHaveBeenCalled();

    mockTeam.members = [OWNER_ROW];
    view.rerender(page());
    await waitFor(() => expect(upsertLicenseSigner).toHaveBeenCalledTimes(1));
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, CONSOLE_KEY.toLowerCase(), {
      kind: 'API_KEY',
      note: 'Console',
      holders: [{ userId: 'u-jane' }],
    });

    mockTeam.members = [{ ...OWNER_ROW }];
    view.rerender(page());
    await act(async () => {});
    expect(upsertLicenseSigner).toHaveBeenCalledTimes(1);
  });

  it('shows a failed enable on the card', async () => {
    enableSigner.mockRejectedValue({ code: 4001 });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Enable console access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The transaction was denied',
    );
    expect(mockSetLoadingStatus).not.toHaveBeenCalled();
  });

  it("refuses before sending when the console wallet doesn't own the license", async () => {
    show([], '0x1111111111111111111111111111111111111111');
    fireEvent.click(await screen.findByRole('button', { name: 'Enable console access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your console wallet doesn't own this license on-chain, so it can't turn on console access.",
    );
    expect(enableSigner).not.toHaveBeenCalled();
  });

  it('labels the API key button for servers', () => {
    show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Create an API key for your server' }),
    );
    expect(
      screen.getByText(/For apps that mint developer JWTs on their own servers/),
    ).toBeInTheDocument();
  });

  it('asks who a new key is for, shows it once enabled, and offers Assign with the holders filled in', async () => {
    (upsertLicenseSigner as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Create an API key for your server' }),
    );
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

  it('records the RentalOS URI even when the user just removed it from the list', async () => {
    jest.useFakeTimers();
    setRedirectUri.mockClear();
    (getDeveloperJwt as jest.Mock).mockResolvedValue({
      headers: { Authorization: 'Bearer dev.jwt' },
    });
    (getUser as jest.Mock).mockResolvedValue({ name: 'Jane', email: 'jane@harness.dev' });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'ok',
    })) as never;
    const Probe = () => {
      const { uris, recordUriChange } = useRedirectUris([
        { uri: 'https://rentals.dimo.co/' },
      ]);
      return (
        <>
          <p data-testid="uris">{uris.map((u) => u.uri).join(',')}</p>
          <button onClick={() => recordUriChange('https://rentals.dimo.co/', false)}>
            drop uri
          </button>
        </>
      );
    };
    render(
      <RedirectUriOverlayProvider refetch={async () => {}}>
        <Probe />
        <QueryClientProvider client={new QueryClient()}>
          <Signers
            license={
              {
                owner: OWNER,
                clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
                tokenId: 42,
                signers: { nodes: [] },
                redirectURIs: { nodes: [{ uri: 'https://rentals.dimo.co/' }] },
              } as never
            }
            refetch={refetchLicense}
          />
        </QueryClientProvider>
      </RedirectUriOverlayProvider>,
    );
    fireEvent.click(screen.getByText('drop uri'));
    expect(screen.getByTestId('uris').textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Register RentalOS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    expect(setRedirectUri).toHaveBeenCalledWith('https://rentals.dimo.co/', true);
    expect(screen.getByTestId('uris').textContent).toBe('https://rentals.dimo.co/');
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

  const openDelete = () => {
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${SIGNER}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete API key' }));
  };

  it('stamps the registry when an API key is deleted', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    show([SIGNER]);
    openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(markLicenseSignerDisabled).toHaveBeenCalledWith(42, SIGNER),
    );
    expect(disableSigner).toHaveBeenCalledWith(SIGNER);
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(
      'API key deleted. JWTs already issued with it work until they expire (up to 14 days).',
    );
  });

  it('closes the dialog as soon as the transaction confirms', async () => {
    let confirm: () => void = () => {};
    disableSigner.mockImplementationOnce(
      () => new Promise<void>((resolve) => (confirm = resolve)),
    );
    (markLicenseSignerDisabled as jest.Mock).mockReturnValue(new Promise(() => {}));
    // The license has not refetched yet, so only pendingRemovals hides the row.
    refetchLicense.mockImplementationOnce(() => new Promise(() => {}));
    show([SIGNER]);
    openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(
      await screen.findByText('Waiting for the network to confirm…'),
    ).toBeInTheDocument();
    await act(async () => confirm());
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull(),
    );
    expect(markLicenseSignerDisabled).toHaveBeenCalled();
  });

  it('keeps a deleted key hidden until the license stops listing it', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    const view = show([SIGNER]);
    openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(refetchLicense).toHaveBeenCalled());
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());
    await act(async () => {});
    // refetch resolved but the license still lists the key: stay hidden
    expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull();
    const license = (signers: string[]) =>
      ({
        owner: OWNER,
        clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
        tokenId: 42,
        signers: {
          nodes: signers.map((address) => ({
            address,
            enabledAt: '2026-09-01T00:00:00Z',
          })),
        },
        redirectURIs: { nodes: [{ uri: 'https://rentals.dimo.co/' }] },
      }) as never;
    const rerenderWith = (signers: string[]) =>
      view.rerender(
        <QueryClientProvider client={new QueryClient()}>
          <Signers license={license(signers)} refetch={refetchLicense} />
        </QueryClientProvider>,
      );
    rerenderWith([SIGNER.toLowerCase()]);
    expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull();
    rerenderWith([]);
    rerenderWith([SIGNER]);
    expect(
      await screen.findByRole('button', { name: `Actions for ${SIGNER}` }),
    ).toBeInTheDocument();
  });

  it('survives a failing refetch', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    refetchLicense.mockRejectedValueOnce(new Error('offline'));
    show([SIGNER]);
    openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(refetchLicense).toHaveBeenCalled());
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull();
  });

  it('turns off the console key with its own copy and toast', async () => {
    mockTeam.members = [OWNER_ROW];
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    show([CONSOLE_KEY.toLowerCase()]);
    await screen.findByText('Console (you)');
    fireEvent.click(
      await screen.findByRole('button', {
        name: `Actions for ${CONSOLE_KEY.toLowerCase()}`,
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Turn off console access' }));
    expect(
      screen.getByText(/The console stops making developer JWTs/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Console access turned off.'),
    );
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());
  });

  it('never covers the page with the loading modal', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    mockSetLoadingStatus.mockClear();
    show([SIGNER]);
    openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(markLicenseSignerDisabled).toHaveBeenCalled());
    await waitFor(() => expect(registry.refetch).toHaveBeenCalled());
    expect(mockSetLoadingStatus).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'loading' }),
    );
  });

  it('says before deleting that issued JWTs keep working', () => {
    show([SIGNER]);
    openDelete();
    expect(screen.getByText(/up to 14 days/)).toBeInTheDocument();
  });

  it('shows a failed transaction in the dialog', async () => {
    disableSigner.mockRejectedValueOnce({ code: 4001 });
    show([SIGNER]);
    openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The transaction was denied',
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByText(SIGNER)).toBeInTheDocument();
  });

  it('is read-only for members', () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    show([SIGNER]);
    expect(
      screen.queryByRole('button', { name: 'Create an API key for your server' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  });
});
