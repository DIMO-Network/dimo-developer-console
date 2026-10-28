import { createOAuthState, takeOAuthState } from '@/utils/oauthState';

describe('oauthState', () => {
  beforeEach(() => sessionStorage.clear());

  it('accepts the return of the sign-in this tab started, once', () => {
    const state = createOAuthState();
    expect(state).toMatch(/^[0-9a-f]{32}$/);
    expect(takeOAuthState(state)).toBe(true);
    expect(takeOAuthState(state)).toBe(false);
  });

  it("refuses a code that came with someone else's state, or none", () => {
    createOAuthState();
    expect(takeOAuthState('0123456789abcdef0123456789abcdef')).toBe(false);
    expect(takeOAuthState(null)).toBe(false);
  });

  it('refuses any return when this tab started no sign-in', () => {
    expect(takeOAuthState('0123456789abcdef0123456789abcdef')).toBe(false);
  });
});
