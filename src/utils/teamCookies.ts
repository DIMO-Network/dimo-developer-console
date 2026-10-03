// Cookies and header shared by the browser, server actions and the middleware
// (contracts C4). invite_token is HttpOnly: only the middleware and server
// actions touch it, so there are no browser helpers for it here.
export const ACTIVE_TEAM_COOKIE = 'active_team';
export const INVITE_TOKEN_COOKIE = 'invite_token';
export const INVITE_QUERY_PARAM = 'invite';
export const TEAM_ID_HEADER = 'X-Team-Id';
export const ACTIVE_TEAM_MAX_AGE = 60 * 60 * 24 * 365;
export const INVITE_TOKEN_MAX_AGE = 60 * 60 * 24;

export const buildCookie = (
  name: string,
  value: string,
  maxAge: number,
  secure: boolean,
) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`;

const isHttps = () => typeof location !== 'undefined' && location.protocol === 'https:';

export const getActiveTeamCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const prefix = `${ACTIVE_TEAM_COOKIE}=`;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!hit) return null;
  const value = decodeURIComponent(hit.slice(prefix.length));
  return value === '' ? null : value;
};

export const setActiveTeamCookie = (teamId: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = buildCookie(
    ACTIVE_TEAM_COOKIE,
    teamId,
    ACTIVE_TEAM_MAX_AGE,
    isHttps(),
  );
};

export const clearActiveTeamCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = buildCookie(ACTIVE_TEAM_COOKIE, '', 0, isHttps());
};
