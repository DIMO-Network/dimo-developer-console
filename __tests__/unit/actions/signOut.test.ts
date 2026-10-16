/**
 * @jest-environment node
 */
const remove = jest.fn();
jest.mock('next/headers', () => ({ cookies: jest.fn(async () => ({ delete: remove })) }));
// middlewareUtils (SESSION_VERDICT_COOKIE) imports jose (ESM) at load time.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
import { endSession, signOut } from '@/actions/user';

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
