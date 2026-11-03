/**
 * @jest-environment node
 */
jest.mock('@/services/teams', () => ({
  fetchMyTeams: jest.fn(),
  fetchTeamMembers: jest.fn(),
}));
jest.mock('@/actions/invites', () => ({ previewPendingInvite: jest.fn() }));

import { GET as getTeams } from '@/app/api/teams/route';
import { GET as getMembers } from '@/app/api/team/members/route';
import { GET as getPendingInvite } from '@/app/api/invites/pending/route';
import { fetchMyTeams, fetchTeamMembers } from '@/services/teams';
import { previewPendingInvite } from '@/actions/invites';

const team = { id: 't1', name: 'Acme' };

describe('team read routes', () => {
  it('GET /api/teams returns the list, never cached', async () => {
    const body = { ok: true, data: { teams: [team] } };
    (fetchMyTeams as jest.Mock).mockResolvedValue(body);
    const res = await getTeams();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(body);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('GET /api/team/members passes NOT_A_MEMBER through', async () => {
    (fetchTeamMembers as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'gone',
    });
    const res = await getMembers();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('NOT_A_MEMBER');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('GET /api/team/members answers 502 when console-api was not reached', async () => {
    (fetchTeamMembers as jest.Mock).mockResolvedValue({
      ok: false,
      status: 0,
      code: null,
      message: 'socket hang up',
    });
    const res = await getMembers();
    expect(res.status).toBe(502);
  });

  it('GET /api/team/members keeps transport text out of the body', async () => {
    (fetchTeamMembers as jest.Mock).mockResolvedValue({
      ok: false,
      status: 0,
      code: null,
      message: 'getaddrinfo ENOTFOUND x',
    });
    const res = await getMembers();
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body).toMatchObject({ ok: false, status: 0, code: null });
    expect(body.message).toBe('Could not reach the console API');
    expect(JSON.stringify(body)).not.toContain('ENOTFOUND');
  });

  it('GET /api/team/members keeps the message of a 403 refusal', async () => {
    (fetchTeamMembers as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'gone',
    });
    expect((await (await getMembers()).json()).message).toBe('gone');
  });

  it('GET /api/invites/pending answers ok with null when there is no invite', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue(null);
    const res = await getPendingInvite();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, data: null });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('GET /api/invites/pending passes a terminal code through', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue({
      ok: false,
      status: 410,
      code: 'INVITE_EXPIRED',
      message: 'x',
    });
    const res = await getPendingInvite();
    expect(res.status).toBe(410);
    expect((await res.json()).code).toBe('INVITE_EXPIRED');
  });
});
