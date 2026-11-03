import React, { Suspense } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const WALLET = '0x1111111111111111111111111111111111111111';
const SIGNER = '0x9999999999999999999999999999999999999999';
const CHECKSUMMED_WALLET = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
const STRANGER = '0x8888888888888888888888888888888888888888';
// A full uint256, as Identity sends it: as a Number this would lose its last digits.
const TOKEN_ID =
  '39078077154588500488734674248814029619038553690572814363163890550005297053696';

// Hardhat's first test account: a real key with a known address.
const DEVICE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEVICE_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const LICENSE_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const FINISH_LATER = /finish.*from connections/i;

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace, push: jest.fn() };
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockMint = jest.fn();
const mockGrant = jest.fn();
jest.mock('@/hooks/useTransactions', () => ({
  useMintConnection: () => ({ mint: mockMint, grant: mockGrant }),
}));

jest.mock('@/actions/connections', () => ({
  createConnection: jest.fn(),
  deleteConnection: jest.fn(),
  updateConnection: jest.fn(),
}));

jest.mock('@/utils/fetchJson', () => ({ fetchJson: jest.fn() }));
jest.mock('@/hooks/queries/useMyConnections', () => ({
  invalidateMyConnectionsQuery: jest.fn(),
  useMyConnections: jest.fn(),
}));

let mockUser: { walletAddress: string; smartContractAddress: string } | undefined;
jest.mock('@/hooks/useGlobalAccount', () => ({
  useGlobalAccount: () => ({ currentUser: mockUser }),
}));
// The Connections list reads the same account through the barrel, which pulls Turnkey.
jest.mock('@/hooks', () => ({
  useGlobalAccount: () => ({ currentUser: mockUser }),
}));

const mockReadContract = jest.fn();
jest.mock('@/services/zerodev', () => ({
  getPublicClient: () => ({ readContract: mockReadContract }),
}));

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

import {
  createConnection,
  deleteConnection,
  updateConnection,
  type Connection,
} from '@/actions/connections';
import {
  invalidateMyConnectionsQuery,
  useMyConnections,
} from '@/hooks/queries/useMyConnections';
import { fetchJson } from '@/utils/fetchJson';
import { HttpError } from '@/utils/httpError';
import { KEYS_UNREADABLE_ON_RESUME, NAME_TAKEN_IN_TEAM } from '@/app/connections/copy';
import { useTeam } from '@/hooks/useTeam';
import ConnectionsList from '@/app/connections/components/View/View';
import { View } from '@/app/connections/create/[owner]/components/View/View';

const row = (overrides: Partial<Connection> = {}): Connection => ({
  id: 'conn-1',
  name: 'Fleet',
  company_id: 'company-1',
  connection_license_public_key: LICENSE_ADDRESS,
  connection_license_private_key: `0x${'a'.repeat(64)}`,
  device_issuance_key: DEVICE_KEY,
  status: 'PENDING',
  token_id: null,
  created_at: '2026-11-02T00:00:00Z',
  updated_at: '2026-11-02T00:00:00Z',
  ...overrides,
});

const identityAnswers = (body: object, ok = true) =>
  (global.fetch as jest.Mock).mockResolvedValue({ ok, json: async () => body });

const identityOwner = (owner: string) =>
  identityAnswers({ data: { connection: { owner, tokenId: TOKEN_ID } } });

// Verbatim what identity-api answers for a name nobody has minted: an error, not
// an empty result.
const identityHasNoSuchName = () =>
  identityAnswers({
    errors: [
      {
        message: 'No connection with name "Fleet".',
        path: ['connection'],
        extensions: { code: 'NOT_FOUND' },
      },
    ],
    data: { connection: null },
  });

const chainSaysHeldBy = (owner: string | null) =>
  mockReadContract.mockImplementation(async ({ functionName }) =>
    functionName === 'exists' ? owner !== null : owner,
  );

const renderPage = async (search = '') => {
  mockSearch = search;
  const params = Promise.resolve({ owner: SIGNER });
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <View params={params} />
      </Suspense>,
    );
  });
};

const button = (name: string) => screen.getByRole('button', { name, hidden: true });

const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(button(name));
  });
};

const buy = async () => {
  await click('Purchase connection license');
  await click('Continue with payment');
};

const statusesSaved = () =>
  (updateConnection as jest.Mock).mock.calls.map(([, patch]) => patch.status);

beforeEach(() => {
  mockUser = { walletAddress: SIGNER, smartContractAddress: WALLET };
  global.fetch = jest.fn();
  chainSaysHeldBy(null);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  (createConnection as jest.Mock).mockResolvedValue({ ok: true, data: row() });
  (updateConnection as jest.Mock).mockResolvedValue(undefined);
  (deleteConnection as jest.Mock).mockResolvedValue({ ok: true, data: null });
  mockMint.mockResolvedValue({ success: true, connectionId: BigInt(TOKEN_ID) });
  mockGrant.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('creating a connection', () => {
  it('saves the keys before spending anything', async () => {
    const order: string[] = [];
    (createConnection as jest.Mock).mockImplementation(async () => {
      order.push('save');
      return { ok: true, data: row() };
    });
    mockMint.mockImplementation(async () => {
      order.push('mint');
      return { success: true, connectionId: BigInt(TOKEN_ID) };
    });
    await renderPage('name=Fleet');

    await buy();

    expect(order).toEqual(['save', 'mint']);
    expect(createConnection).toHaveBeenCalledWith({
      name: 'Fleet',
      connection_license_public_key: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
      connection_license_private_key: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      device_issuance_key: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      status: 'PENDING',
    });
    expect(mockMint).toHaveBeenCalledWith('Fleet');
  });

  it("spends nothing if the keys can't be saved", async () => {
    (createConnection as jest.Mock).mockRejectedValue(
      new Error('An error occurred in the Server Components render.'),
    );
    await renderPage('name=Fleet');

    await buy();

    expect(mockMint).not.toHaveBeenCalled();
    expect(
      screen.getByText("Couldn't save your connection keys, so nothing was minted."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Server Components/)).toBeNull();
  });

  it("spends nothing if the keys can't be saved (refusal)", async () => {
    (createConnection as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      code: null,
      message: 'boom',
    });
    await renderPage('name=Fleet');

    await buy();

    expect(mockMint).not.toHaveBeenCalled();
    expect(
      screen.getByText("Couldn't save your connection keys, so nothing was minted."),
    ).toBeInTheDocument();
  });

  it('says the team already uses the name', async () => {
    (createConnection as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      code: 'CONNECTION_NAME_TAKEN',
      message: 'Your team already has a connection with this name',
    });
    await renderPage('name=Fleet');

    await buy();

    expect(screen.getByText(NAME_TAKEN_IN_TEAM)).toBeInTheDocument();
    expect(mockMint).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Couldn't save your connection keys, so nothing was minted."),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue with payment' })).toBeNull();
  });

  it('removes the row when the mint is refused', async () => {
    mockMint.mockResolvedValue({ success: false, reason: 'Insufficient DIMO balance.' });
    await renderPage('name=Fleet');

    await buy();

    expect(deleteConnection).toHaveBeenCalledWith('conn-1');
    expect(screen.getByText('Insufficient DIMO balance.')).toBeInTheDocument();
    expect(updateConnection).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
    const deleted = (deleteConnection as jest.Mock).mock.invocationCallOrder[0];
    const invalidated = (invalidateMyConnectionsQuery as jest.Mock).mock
      .invocationCallOrder;
    expect(invalidated.some((call) => call > deleted)).toBe(true);
  });

  // Here the name field is on the page, and the row is new: the advice holds.
  it('tells a new purchase to choose a different name', async () => {
    const reason =
      'This connection name is already taken. Please choose a different name and try again.';
    mockMint.mockResolvedValue({ success: false, nameInUse: true, reason });
    await renderPage('name=Fleet');

    await buy();

    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(deleteConnection).toHaveBeenCalledWith('conn-1');
  });

  it('still shows why the mint was refused if the row cannot be removed', async () => {
    mockMint.mockResolvedValue({ success: false, reason: 'Insufficient DIMO balance.' });
    (deleteConnection as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      code: null,
      message: 'masked',
    });
    await renderPage('name=Fleet');

    await buy();

    expect(screen.getByText('Insufficient DIMO balance.')).toBeInTheDocument();
    expect(screen.queryByText(FINISH_LATER)).toBeNull();
  });

  it('keeps the row when the mint throws: the transaction may have landed', async () => {
    mockMint.mockRejectedValue(new Error('bundler timed out'));
    await renderPage('name=Fleet');

    await buy();

    expect(deleteConnection).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(screen.queryByText(/bundler/)).toBeNull();
  });

  it('keeps everything when saving the mint fails', async () => {
    (updateConnection as jest.Mock).mockRejectedValue(new Error('masked'));
    await renderPage('name=Fleet');

    await buy();

    expect(deleteConnection).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(screen.queryByText('masked')).toBeNull();
  });

  it('keeps everything when granting fails', async () => {
    mockGrant.mockRejectedValue(new Error('user closed the passkey prompt'));
    await renderPage('name=Fleet');

    await buy();

    expect(statusesSaved()).toEqual(['MINTED']);
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('keeps everything when saving READY fails', async () => {
    (updateConnection as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('masked'));
    await renderPage('name=Fleet');

    await buy();

    expect(deleteConnection).not.toHaveBeenCalled();
    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // Paying again would generate new keys for a name the first attempt may own.
  it('does not offer to pay again once something may have been spent', async () => {
    mockGrant.mockRejectedValue(new Error('nope'));
    await renderPage('name=Fleet');

    await buy();

    expect(
      screen.queryByRole('button', { name: 'Continue with payment', hidden: true }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Purchase connection license', hidden: true }),
    ).toBeNull();
    expect(screen.getByRole('link', { name: /back to connections/i })).toHaveAttribute(
      'href',
      '/connections',
    );
  });

  it('records each step in order, then redirects as before', async () => {
    await renderPage('name=Fleet');

    await buy();

    expect((updateConnection as jest.Mock).mock.calls).toEqual([
      ['conn-1', { status: 'MINTED', token_id: TOKEN_ID }],
      ['conn-1', { status: 'READY' }],
    ]);
    const { mock: minted } = mockMint;
    const { mock: granted } = mockGrant;
    const { mock: saved } = updateConnection as jest.Mock;
    expect(minted.invocationCallOrder[0]).toBeLessThan(saved.invocationCallOrder[0]);
    expect(saved.invocationCallOrder[0]).toBeLessThan(granted.invocationCallOrder[0]);
    expect(granted.invocationCallOrder[0]).toBeLessThan(saved.invocationCallOrder[1]);
    expect(granted.calls[0][0].connectionId).toBe(BigInt(TOKEN_ID));
    // Created, minted and ready all show in the list.
    expect(invalidateMyConnectionsQuery).toHaveBeenCalledTimes(3);
    expect(mockReplace).toHaveBeenCalledWith('/connections?success=connection-created');
    expect(deleteConnection).not.toHaveBeenCalled();
  });
});

describe('resuming a connection', () => {
  const resumeWith = async (connection: Connection) => {
    (fetchJson as jest.Mock).mockResolvedValue(connection);
    await renderPage('resume=conn-1');
  };

  it('resumes a minted connection without minting again', async () => {
    await resumeWith(row({ status: 'MINTED', token_id: TOKEN_ID }));

    await click('Finish setup');

    expect(fetchJson).toHaveBeenCalledWith('/api/connections/conn-1');
    expect(mockMint).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: BigInt(TOKEN_ID),
        licenseGrantee: LICENSE_ADDRESS,
        deviceIssuanceGrantee: DEVICE_ADDRESS,
      }),
    );
    expect(statusesSaved()).toEqual(['READY']);
    expect(mockReplace).toHaveBeenCalledWith('/connections?success=connection-created');
  });

  it('grants the addresses the first run granted', async () => {
    let saved: Record<string, string> = {};
    (createConnection as jest.Mock).mockImplementation(async (input) => {
      saved = input;
      return { ok: true, data: row(input) };
    });
    await renderPage('name=Fleet');
    await buy();
    const firstRun = mockGrant.mock.calls[0][0];
    cleanup();
    mockGrant.mockClear();

    await resumeWith(row({ ...saved, status: 'MINTED', token_id: TOKEN_ID }));
    await click('Finish setup');

    const resumed = mockGrant.mock.calls[0][0];
    expect(resumed.licenseGrantee).toBe(firstRun.licenseGrantee);
    expect(resumed.deviceIssuanceGrantee).toBe(firstRun.deviceIssuanceGrantee);
  });

  it('finds a mint the browser never recorded', async () => {
    identityOwner(WALLET);
    await resumeWith(row());

    await click('Finish setup');

    expect(mockMint).not.toHaveBeenCalled();
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('identity-api');
    expect(JSON.parse(init.body).query).toContain('connection(by: { name: $name })');
    expect(JSON.parse(init.body).variables).toEqual({ name: 'Fleet' });
    expect((updateConnection as jest.Mock).mock.calls).toEqual([
      ['conn-1', { status: 'MINTED', token_id: TOKEN_ID }],
      ['conn-1', { status: 'READY' }],
    ]);
    expect(mockGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: BigInt(TOKEN_ID),
        licenseGrantee: LICENSE_ADDRESS,
        deviceIssuanceGrantee: DEVICE_ADDRESS,
      }),
    );
  });

  it('compares owners ignoring case', async () => {
    mockUser = {
      walletAddress: SIGNER,
      smartContractAddress: CHECKSUMMED_WALLET as `0x${string}`,
    };
    identityOwner(CHECKSUMMED_WALLET.toLowerCase());
    await resumeWith(row());

    await click('Finish setup');

    expect(mockGrant).toHaveBeenCalled();
    expect(mockMint).not.toHaveBeenCalled();
  });

  it('stops when another wallet owns the name', async () => {
    identityOwner(STRANGER);
    await resumeWith(row());

    await click('Finish setup');

    expect(screen.getByText(/name is taken/i)).toBeInTheDocument();
    expect(mockMint).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(updateConnection).not.toHaveBeenCalled();
  });

  // Connections belong to the smart account: it is the mint's `to`. The signer owns
  // nothing, so it can't be the address that proves a connection is ours.
  it('does not take the signer for the owner', async () => {
    identityOwner(SIGNER);
    await resumeWith(row());

    await click('Finish setup');

    expect(screen.getByText(/name is taken/i)).toBeInTheDocument();
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it('asks before spending when nothing was minted, then mints once', async () => {
    identityHasNoSuchName();
    await resumeWith(row());

    await click('Finish setup');

    expect(mockMint).not.toHaveBeenCalled();
    await click('Continue with payment');

    expect(mockMint).toHaveBeenCalledTimes(1);
    expect(mockMint).toHaveBeenCalledWith('Fleet');
    expect(createConnection).not.toHaveBeenCalled();
    expect(statusesSaved()).toEqual(['MINTED', 'READY']);
    expect(mockGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: BigInt(TOKEN_ID),
        deviceIssuanceGrantee: DEVICE_ADDRESS,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/connections?success=connection-created');
  });

  // The window right after a mint: on chain, not yet indexed. Without the chain read
  // this opens the $1 modal, and the mint is refused with NameAlreadyInUse.
  describe('when Identity has not indexed the mint yet', () => {
    // A real connection, so the id the page saves is the contract's.
    const named = () => row({ name: 'Vehicle Simulator' });

    it("finishes this wallet's connection without minting", async () => {
      identityHasNoSuchName();
      chainSaysHeldBy(WALLET);
      await resumeWith(named());

      await click('Finish setup');

      expect(mockMint).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', { name: 'Continue with payment', hidden: true }),
      ).toBeNull();
      expect((updateConnection as jest.Mock).mock.calls).toEqual([
        ['conn-1', { status: 'MINTED', token_id: TOKEN_ID }],
        ['conn-1', { status: 'READY' }],
      ]);
      expect(mockGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: BigInt(TOKEN_ID),
          deviceIssuanceGrantee: DEVICE_ADDRESS,
        }),
      );
    });

    it('stops when the chain says another wallet holds the name', async () => {
      identityHasNoSuchName();
      chainSaysHeldBy(STRANGER);
      await resumeWith(named());

      await click('Finish setup');

      expect(screen.getByText(/name is taken/i)).toBeInTheDocument();
      expect(mockMint).not.toHaveBeenCalled();
      expect(mockGrant).not.toHaveBeenCalled();
      expect(deleteConnection).not.toHaveBeenCalled();
      expect(updateConnection).not.toHaveBeenCalled();
    });

    it('does not mint when the chain cannot be read', async () => {
      identityHasNoSuchName();
      mockReadContract.mockRejectedValue(new Error('rpc down'));
      await resumeWith(named());

      await click('Finish setup');

      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      expect(screen.queryByText(/rpc down/)).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Continue with payment', hidden: true }),
      ).toBeNull();
      expect(mockMint).not.toHaveBeenCalled();
      expect(deleteConnection).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['answers 500', () => identityAnswers({}, false)],
    [
      'answers no connection and no error',
      () => identityAnswers({ data: { connection: null } }),
    ],
    ['answers empty data', () => identityAnswers({ data: {} })],
    [
      'answers an error other than not found',
      () =>
        identityAnswers({
          errors: [{ message: 'db down', extensions: { code: 'INTERNAL' } }],
          data: { connection: null },
        }),
    ],
    [
      'cannot be reached',
      () => (global.fetch as jest.Mock).mockRejectedValue(new TypeError('offline')),
    ],
  ])('never mints when Identity %s', async (_label, answer) => {
    answer();
    await resumeWith(row());

    await click('Finish setup');

    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue with payment', hidden: true }),
    ).toBeNull();
    expect(mockMint).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it("can't tell who owns the name without the wallet, so it doesn't mint", async () => {
    mockUser = undefined;
    identityHasNoSuchName();
    await resumeWith(row());

    await click('Finish setup');

    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockMint).not.toHaveBeenCalled();
  });

  it('leaves the row and shows the reason when a resumed mint is refused', async () => {
    identityHasNoSuchName();
    mockMint.mockResolvedValue({ success: false, reason: 'This name is taken.' });
    await resumeWith(row());

    await click('Finish setup');
    await click('Continue with payment');

    expect(screen.getByText('This name is taken.')).toBeInTheDocument();
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(updateConnection).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
  });

  // Chain and Identity can both say nobody and the mint still lose the name: another
  // wallet got there first, or the earlier attempt landed in between. There is no name
  // field here, and following "choose a different name" would cost another $1.
  it('never tells a resume to choose a different name', async () => {
    identityHasNoSuchName();
    mockMint.mockResolvedValue({
      success: false,
      nameInUse: true,
      reason:
        'This connection name is already taken. Please choose a different name and try again.',
    });
    await resumeWith(row());

    await click('Finish setup');
    await click('Continue with payment');

    expect(screen.queryByText(/different name/i)).toBeNull();
    expect(
      screen.getByText(
        'If your earlier attempt went through, it can take a minute to appear. Try Finish setup again shortly.',
      ),
    ).toBeInTheDocument();
    expect(button('Finish setup')).toBeEnabled();
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(updateConnection).not.toHaveBeenCalled();
  });

  it('leaves the row when a resumed mint throws', async () => {
    identityHasNoSuchName();
    mockMint.mockRejectedValue(new Error('bundler timed out'));
    await resumeWith(row());

    await click('Finish setup');
    await click('Continue with payment');

    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it('keeps the row when saving the found mint fails', async () => {
    identityOwner(WALLET);
    (updateConnection as jest.Mock).mockRejectedValue(new Error('masked'));
    await resumeWith(row());

    await click('Finish setup');

    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(mockGrant).not.toHaveBeenCalled();
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  // The API doesn't enforce transitions, and the token id isn't there to grant on.
  it('asks Identity for a minted row with no token id', async () => {
    identityOwner(WALLET);
    await resumeWith(row({ status: 'MINTED', token_id: null }));

    await click('Finish setup');

    expect(mockMint).not.toHaveBeenCalled();
    expect(mockGrant).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: BigInt(TOKEN_ID) }),
    );
  });

  it('sends a finished connection back to the list', async () => {
    await resumeWith(row({ status: 'READY', token_id: TOKEN_ID }));

    expect(mockReplace).toHaveBeenCalledWith('/connections');
    expect(
      screen.queryByRole('button', { name: 'Finish setup', hidden: true }),
    ).toBeNull();
    expect(mockMint).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it('counts a row from an older API, with no status, as finished', async () => {
    await resumeWith(row({ status: undefined }));

    expect(mockReplace).toHaveBeenCalledWith('/connections');
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it.each([
    [
      'comes without its keys',
      row({ connection_license_private_key: null, device_issuance_key: null } as never),
      /only the team owner/i,
    ],
    [
      "has keys that can't be read",
      row({
        keys_unreadable: true,
        connection_license_private_key: null,
        device_issuance_key: null,
      }),
      KEYS_UNREADABLE_ON_RESUME,
    ],
  ])('offers nothing when the row %s', async (_label, connection, message) => {
    await resumeWith(connection);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Finish setup', hidden: true }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Purchase connection license', hidden: true }),
    ).toBeNull();
    expect(mockMint).not.toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stops a resume of a deleted connection as gone', async () => {
    (fetchJson as jest.Mock).mockRejectedValue(new HttpError(404, 'gone'));
    await renderPage('resume=conn-1');

    expect(screen.getByText(/no longer exists/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load this connection/i)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Finish setup', hidden: true }),
    ).toBeNull();
    expect(mockMint).not.toHaveBeenCalled();
  });

  it("stops a resume whose keys can't be read", async () => {
    await resumeWith(
      row({
        keys_unreadable: true,
        connection_license_private_key: null,
        device_issuance_key: null,
      }),
    );

    expect(screen.getByText(KEYS_UNREADABLE_ON_RESUME)).toBeInTheDocument();
    expect(screen.queryByText(/only the team owner/i)).toBeNull();
  });

  it("says so when the row can't be loaded, in its own words", async () => {
    (fetchJson as jest.Mock).mockRejectedValue(new Error('masked'));
    await renderPage('resume=conn-1');

    expect(screen.getByText(/couldn't load this connection/i)).toBeInTheDocument();
    expect(screen.queryByText('masked')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Purchase connection license', hidden: true }),
    ).toBeNull();
  });

  it('does not offer a new purchase while the row loads', async () => {
    (fetchJson as jest.Mock).mockReturnValue(new Promise(() => undefined));
    await renderPage('resume=conn-1');

    expect(
      screen.queryByRole('button', { name: 'Purchase connection license', hidden: true }),
    ).toBeNull();
  });

  it('never puts a key on the page or in a log', async () => {
    const logged = jest.spyOn(console, 'error');
    mockGrant.mockRejectedValue(new Error('nope'));
    await resumeWith(row({ status: 'MINTED', token_id: TOKEN_ID }));

    await click('Finish setup');

    expect(screen.getByText(FINISH_LATER)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(DEVICE_KEY);
    expect(JSON.stringify(logged.mock.calls)).not.toContain(DEVICE_KEY);
  });
});

describe('the Connections list', () => {
  const listWith = (connections: Connection[], isOwner = true) => {
    (useMyConnections as jest.Mock).mockReturnValue({
      data: connections,
      isLoading: false,
    });
    (useTeam as jest.Mock).mockReturnValue({ isOwner });
    render(<ConnectionsList />);
  };

  const finishLinks = () =>
    screen
      .queryAllByRole('link', { name: 'Finish setup' })
      .map((link) => link.getAttribute('href'));

  it('offers Finish setup for an unfinished connection', () => {
    listWith([
      row({ id: 'pending', status: 'PENDING' }),
      row({ id: 'minted', status: 'MINTED', token_id: TOKEN_ID }),
    ]);

    expect(finishLinks()).toEqual([
      `/connections/create/${SIGNER}?resume=pending`,
      `/connections/create/${SIGNER}?resume=minted`,
    ]);
  });

  it('offers nothing for finished connections, or rows from an older API', () => {
    listWith([
      row({ id: 'ready', status: 'READY', token_id: TOKEN_ID }),
      row({ id: 'older', status: undefined }),
    ]);

    expect(finishLinks()).toEqual([]);
  });

  it('offers it to owners only', () => {
    listWith([row({ status: 'PENDING' })], false);

    expect(finishLinks()).toEqual([]);
  });
});
