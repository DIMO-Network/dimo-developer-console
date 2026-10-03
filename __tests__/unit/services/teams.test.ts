/**
 * @jest-environment node
 */
import { AxiosError, type AxiosResponse } from 'axios';

const client = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: jest.fn(async () => client),
}));
import * as teams from '@/services/teams';

const axiosFailure = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe('team endpoints', () => {
  beforeEach(() => Object.values(client).forEach((fn) => fn.mockReset()));

  it('lists teams', async () => {
    client.get.mockResolvedValue({ data: { teams: [{ id: 't1' }] } });
    await expect(teams.fetchMyTeams()).resolves.toEqual({
      ok: true,
      data: { teams: [{ id: 't1' }] },
    });
    expect(client.get).toHaveBeenCalledWith('/api/my/teams');
  });

  it('maps a console-api error code', async () => {
    client.post.mockRejectedValue(
      axiosFailure(409, { message: 'Already a member', code: 'ALREADY_MEMBER' }),
    );
    await expect(teams.postInvitation('sam@harness.dev')).resolves.toEqual({
      ok: false,
      status: 409,
      code: 'ALREADY_MEMBER',
      message: 'Already a member',
    });
    expect(client.post).toHaveBeenCalledWith('/api/my/team/invitations', {
      email: 'sam@harness.dev',
    });
  });

  it('uses the contract paths for every endpoint', async () => {
    client.post.mockResolvedValue({ data: {} });
    client.put.mockResolvedValue({ data: {} });
    client.delete.mockResolvedValue({ data: '' });
    client.get.mockResolvedValue({ data: {} });
    await teams.postResendInvitation('inv 1');
    await teams.deleteInvitation('inv-2');
    await teams.postInvitePreview('tok');
    await teams.postAcceptInvitation('tok');
    await teams.deleteTeamMember('m-1');
    await teams.postLeaveTeam();
    await teams.putSignerProof({
      address: '0xA',
      message: 'm',
      signature: '0xs',
    } as never);
    await teams.fetchTeamMembers();
    await teams.fetchLicenseSigners(42);
    await teams.putLicenseSigner(42, '0xAbC', {
      kind: 'API_KEY',
      holders: [{ name: 'Ops' }],
    });
    await teams.postLicenseSignerDisabled(42, '0xAbC');
    expect(client.post.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/invitations/inv%201/resend',
      '/api/invitations/preview',
      '/api/invitations/accept',
      '/api/my/team/leave',
      '/api/my/licenses/42/signers/0xAbC/disabled',
    ]);
    expect(client.post.mock.calls[1][1]).toEqual({ token: 'tok' });
    expect(client.post.mock.calls[2][1]).toEqual({ token: 'tok' });
    expect(client.delete.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/invitations/inv-2',
      '/api/my/team/members/m-1',
    ]);
    expect(client.put.mock.calls.map((c) => c[0])).toEqual([
      '/api/me/signer',
      '/api/my/licenses/42/signers/0xAbC',
    ]);
    expect(client.get.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/members',
      '/api/my/licenses/42/signers',
    ]);
  });

  it('answers a network failure with status 0', async () => {
    client.get.mockRejectedValue(new Error('socket hang up'));
    await expect(teams.fetchMyTeams()).resolves.toEqual({
      ok: false,
      status: 0,
      code: null,
      message: 'socket hang up',
    });
  });
});
