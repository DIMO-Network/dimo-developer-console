import {
  ACTIVE_TEAM_COOKIE,
  buildCookie,
  clearActiveTeamCookie,
  getActiveTeamCookie,
  INVITE_TOKEN_COOKIE,
  setActiveTeamCookie,
  TEAM_ID_HEADER,
} from '@/utils/teamCookies';

describe('team cookies', () => {
  beforeEach(() => {
    document.cookie = `${ACTIVE_TEAM_COOKIE}=; Path=/; Max-Age=0`;
  });

  it('uses the contract names', () => {
    expect(ACTIVE_TEAM_COOKIE).toBe('active_team');
    expect(INVITE_TOKEN_COOKIE).toBe('invite_token');
    expect(TEAM_ID_HEADER).toBe('X-Team-Id');
  });

  it('round-trips the active team and clears it', () => {
    expect(getActiveTeamCookie()).toBeNull();
    setActiveTeamCookie('team-acme');
    expect(getActiveTeamCookie()).toBe('team-acme');
    clearActiveTeamCookie();
    expect(getActiveTeamCookie()).toBeNull();
  });

  it('encodes values that are not cookie-safe', () => {
    setActiveTeamCookie('a b;c');
    expect(getActiveTeamCookie()).toBe('a b;c');
  });

  it('marks the cookie Secure on https only', () => {
    expect(buildCookie('active_team', 't', 60, true)).toBe(
      'active_team=t; Path=/; Max-Age=60; SameSite=Lax; Secure',
    );
    expect(buildCookie('active_team', 't', 60, false)).toBe(
      'active_team=t; Path=/; Max-Age=60; SameSite=Lax',
    );
  });
});
