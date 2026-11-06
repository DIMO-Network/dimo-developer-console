/**
 * @jest-environment node
 */
const remove = jest.fn();
const set = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ delete: remove, set })),
}));
// middlewareUtils (SESSION_VERDICT_COOKIE) imports jose (ESM) at load time.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
jest.mock('@/utils/middlewareUtils', () => ({
  ...jest.requireActual('@/utils/middlewareUtils'),
  decodeJwtToken: jest.fn(),
}));
jest.mock('@/services/sessionCheck', () => ({ checkSession: jest.fn() }));
import { endSession, saveToken, signOut } from '@/actions/user';
import { checkSession } from '@/services/sessionCheck';
import { decodeJwtToken, sessionVerdictFor } from '@/utils/middlewareUtils';

describe('signOut (contracts C4)', () => {
  it('deletes the session, its verdict, the active team and a pending invite', async () => {
    await signOut();
    expect(remove.mock.calls.map(([name]) => name).sort()).toEqual([
      'active_team',
      'invite_token',
      'session-token',
      'session-verdict',
    ]);
  });
});

describe('endSession', () => {
  beforeEach(() => remove.mockClear());

  it('ends an expired session but leaves the active team and a pending invite to the next sign-in', async () => {
    await endSession();
    expect(remove.mock.calls.map(([name]) => name).sort()).toEqual([
      'session-token',
      'session-verdict',
    ]);
  });
});

describe('saveToken', () => {
  const verdictSet = () => set.mock.calls.find(([name]) => name === 'session-verdict');

  beforeEach(() => {
    set.mockClear();
    (decodeJwtToken as jest.Mock).mockResolvedValue({ sub: 'user' });
    (checkSession as jest.Mock).mockResolvedValue({ status: 'ok' });
  });

  it('keeps the session off cross-site requests and out of page scripts', async () => {
    await saveToken('jwt', 900);
    expect(set).toHaveBeenCalledWith(
      'session-token',
      'jwt',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('remembers a session that passes the proxy check, so the next pages skip it', async () => {
    // A 30-minute session; the verdict lasts the proxy's 15 minutes.
    await saveToken('jwt', 1_800);
    expect(checkSession).toHaveBeenCalledWith('jwt');
    expect(verdictSet()).toEqual([
      'session-verdict',
      await sessionVerdictFor('jwt'),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 900,
      }),
    ]);
  });

  it.each([
    [
      'an unfinished account',
      () =>
        (checkSession as jest.Mock).mockResolvedValue({
          status: 'unfinished',
          missingFlow: 'build-for',
        }),
    ],
    [
      'no global account',
      () => (checkSession as jest.Mock).mockResolvedValue({ status: 'no-account' }),
    ],
    [
      'a failed lookup',
      () => (checkSession as jest.Mock).mockRejectedValue(new Error('console-api down')),
    ],
    [
      'a token that does not verify',
      () => (decodeJwtToken as jest.Mock).mockRejectedValue(new Error('bad signature')),
    ],
  ])(
    'leaves %s to the proxy: the session is saved, nothing remembered',
    async (_, arrange) => {
      arrange();
      await saveToken('jwt', 900);
      expect(set).toHaveBeenCalledWith('session-token', 'jwt', expect.anything());
      expect(verdictSet()).toBeUndefined();
    },
  );

  it('does not check an unverified token with console-api', async () => {
    (decodeJwtToken as jest.Mock).mockRejectedValue(new Error('bad signature'));
    await saveToken('jwt', 900);
    expect(checkSession).not.toHaveBeenCalled();
  });

  it('gives the check 3 seconds, then signs in without it', async () => {
    jest.useFakeTimers();
    try {
      (checkSession as jest.Mock).mockReturnValue(new Promise(() => {}));
      const saved = saveToken('jwt', 900);
      await jest.advanceTimersByTimeAsync(3_000);
      await saved;
      expect(set).toHaveBeenCalledWith('session-token', 'jwt', expect.anything());
      expect(verdictSet()).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
