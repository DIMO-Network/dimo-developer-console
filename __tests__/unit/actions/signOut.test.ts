/**
 * @jest-environment node
 */
const remove = jest.fn();
jest.mock('next/headers', () => ({ cookies: jest.fn(async () => ({ delete: remove })) }));
import { signOut } from '@/actions/user';

describe('signOut (contracts C4)', () => {
  it('deletes the session, the active team and a pending invite', async () => {
    await signOut();
    expect(remove.mock.calls.map(([name]) => name).sort()).toEqual([
      'active_team',
      'invite_token',
      'session-token',
    ]);
  });
});
