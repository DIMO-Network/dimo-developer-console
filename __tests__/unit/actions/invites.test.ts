/**
 * @jest-environment node
 */
const store = new Map<string, string>();
const remove = jest.fn((name: string) => store.delete(name));
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined),
    delete: remove,
  })),
}));
jest.mock('@/services/teams', () => ({
  postInvitePreview: jest.fn(),
  postAcceptInvitation: jest.fn(),
}));
// middlewareUtils (SESSION_VERDICT_COOKIE) imports jose (ESM) at load time.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
import { postAcceptInvitation, postInvitePreview } from '@/services/teams';
import { acceptPendingInvite, previewPendingInvite } from '@/actions/invites';

const failure = (status: number, code: string | null) => ({
  ok: false,
  status,
  code,
  message: 'x',
});

describe('invite server actions', () => {
  beforeEach(() => {
    store.clear();
    remove.mockClear();
  });

  it('answers null without an invite cookie', async () => {
    await expect(previewPendingInvite()).resolves.toBeNull();
    await expect(acceptPendingInvite()).resolves.toBeNull();
    expect(postInvitePreview).not.toHaveBeenCalled();
  });

  it('previews without deleting the cookie', async () => {
    store.set('invite_token', 'tok');
    (postInvitePreview as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        teamName: 'Acme Mobility',
        ownerEmail: 'ops@acme.dev',
        expiresAt: '2026-10-09T00:00:00Z',
      },
    });
    await expect(previewPendingInvite()).resolves.toMatchObject({ ok: true });
    expect(postInvitePreview).toHaveBeenCalledWith('tok');
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes the cookie on success and on terminal errors only', async () => {
    store.set('invite_token', 'tok');
    (postAcceptInvitation as jest.Mock).mockResolvedValueOnce({
      ok: true,
      data: { team: { id: 't' } },
    });
    await acceptPendingInvite();
    expect(remove).toHaveBeenCalledWith('invite_token');
    // The middleware re-checks the session on the next request.
    expect(remove).toHaveBeenCalledWith('session-verdict');

    for (const code of [
      'INVITE_INVALID',
      'INVITE_EXPIRED',
      'INVITE_EMAIL_MISMATCH',
      'ALREADY_MEMBER',
    ]) {
      store.set('invite_token', 'tok');
      remove.mockClear();
      (postAcceptInvitation as jest.Mock).mockResolvedValueOnce(failure(400, code));
      await acceptPendingInvite();
      expect(remove).toHaveBeenCalledWith('invite_token');
      expect(remove).not.toHaveBeenCalledWith('session-verdict');
    }
  });

  it('keeps the cookie on a network failure or an unknown error', async () => {
    store.set('invite_token', 'tok');
    (postAcceptInvitation as jest.Mock).mockResolvedValueOnce(failure(0, null));
    await acceptPendingInvite();
    (postInvitePreview as jest.Mock).mockResolvedValueOnce(failure(502, null));
    await previewPendingInvite();
    expect(remove).not.toHaveBeenCalled();
  });
});
