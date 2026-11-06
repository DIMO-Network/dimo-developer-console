import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const WALLET = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
const STRANGER = '0x8888888888888888888888888888888888888888';

jest.mock('@/actions/connections', () => ({ deleteConnection: jest.fn() }));
jest.mock('@/services/connectionLookup', () => ({ findMintedConnection: jest.fn() }));
let mockUser: { smartContractAddress?: string } | undefined;
jest.mock('@/hooks/useGlobalAccount', () => ({
  useGlobalAccount: () => ({ currentUser: mockUser }),
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/hooks/queries/useMyConnections', () => ({
  invalidateMyConnectionsQuery: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { toast } from 'sonner';
import { deleteConnection, type Connection } from '@/actions/connections';
import { findMintedConnection } from '@/services/connectionLookup';
import { invalidateMyConnectionsQuery } from '@/hooks/queries/useMyConnections';
import { useTeam } from '@/hooks/useTeam';
import { DiscardConnection } from '@/app/connections/components/DiscardConnection';
import {
  DISCARD_FAILED,
  DISCARD_LOOKUP_FAILED,
  DISCARD_MINTED,
  DISCARD_NOT_PENDING,
  DISCARD_SUBTITLE,
} from '@/app/connections/copy';

const connection = (overrides: Partial<Connection> = {}): Connection => ({
  id: 'c1',
  name: 'Fleet link',
  company_id: 'co',
  connection_license_public_key: '0x1',
  connection_license_private_key: '0x2',
  device_issuance_key: '0x3',
  status: 'PENDING',
  created_at: '',
  updated_at: '',
  ...overrides,
});

const open = (c: Connection = connection(), isOwner = true) => {
  (useTeam as jest.Mock).mockReturnValue({ isOwner });
  render(<DiscardConnection connection={c} />);
};

const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name, hidden: true }));
  });
};

const discard = async () => {
  open();
  await click('Discard');
  await click('Confirm');
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { smartContractAddress: WALLET };
  (findMintedConnection as jest.Mock).mockResolvedValue(null);
  (deleteConnection as jest.Mock).mockResolvedValue({ ok: true, data: null });
});

describe('DiscardConnection', () => {
  it.each(['MINTED', 'READY'] as const)('offers nothing on a %s connection', (status) => {
    open(connection({ status }));
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
  });

  it('offers Discard on a PENDING connection', () => {
    open();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('offers it only to the owner', () => {
    open(connection(), false);
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
  });

  it('asks before discarding', async () => {
    open();
    await click('Discard');

    expect(screen.getByText('Discard Fleet link?')).toBeInTheDocument();
    expect(screen.getByText(DISCARD_SUBTITLE)).toBeInTheDocument();
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(findMintedConnection).not.toHaveBeenCalled();
  });

  it('discards when nobody holds the name', async () => {
    await discard();

    expect(findMintedConnection).toHaveBeenCalledWith('Fleet link');
    expect(deleteConnection).toHaveBeenCalledWith('c1');
    expect(toast.success).toHaveBeenCalledWith('Connection discarded');
    expect(invalidateMyConnectionsQuery).toHaveBeenCalled();
  });

  it("refuses to discard a connection the user's wallet minted", async () => {
    (findMintedConnection as jest.Mock).mockResolvedValue({
      owner: WALLET.toUpperCase().replace('0X', '0x'),
      tokenId: '1',
    });
    await discard();

    expect(toast.error).toHaveBeenCalledWith(DISCARD_MINTED);
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it('discards when another wallet holds the name', async () => {
    (findMintedConnection as jest.Mock).mockResolvedValue({
      owner: STRANGER,
      tokenId: '1',
    });
    await discard();

    expect(deleteConnection).toHaveBeenCalledWith('c1');
    expect(toast.success).toHaveBeenCalledWith('Connection discarded');
  });

  it("discards nothing when the wallet isn't known", async () => {
    mockUser = undefined;
    await discard();

    expect(toast.error).toHaveBeenCalledWith(DISCARD_LOOKUP_FAILED);
    expect(deleteConnection).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('discards nothing when the lookup fails', async () => {
    (findMintedConnection as jest.Mock).mockRejectedValue(new Error('identity down'));
    await discard();

    expect(toast.error).toHaveBeenCalledWith(DISCARD_LOOKUP_FAILED);
    expect(deleteConnection).not.toHaveBeenCalled();
  });

  it('says when the connection moved past setup', async () => {
    (deleteConnection as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      code: 'CONNECTION_NOT_PENDING',
      message: 'x',
    });
    await discard();

    expect(toast.error).toHaveBeenCalledWith(DISCARD_NOT_PENDING);
    expect(invalidateMyConnectionsQuery).toHaveBeenCalled();
  });

  it('stays quiet for a row that is already gone, and refreshes', async () => {
    (deleteConnection as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      code: 'CONNECTION_NOT_FOUND',
      message: 'x',
    });
    await discard();

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidateMyConnectionsQuery).toHaveBeenCalled();
  });

  it('reports any other failure', async () => {
    (deleteConnection as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      code: null,
      message: 'x',
    });
    await discard();

    expect(toast.error).toHaveBeenCalledWith(DISCARD_FAILED);
    expect(invalidateMyConnectionsQuery).toHaveBeenCalled();
  });
});
