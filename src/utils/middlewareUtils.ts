import { AxiosError } from 'axios';
import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose';

export const isIn = (url: string) => (path: string) => url.startsWith(path);

/**
 * Whether a failure means "this session is over" rather than "this session was
 * not allowed to do that".
 *
 * Only the session check -- GET /api/me, the request the middleware makes to
 * establish who is calling -- can answer that question. A 401 from any other
 * endpoint says the session could not make that one request, which is a
 * different thing and must not end it. Scoped because it was not: a 401 from
 * any call made during the middleware's run signed the user out of the whole
 * console, which happened repeatedly while the template editor's own route was
 * returning 401 for everyone.
 */
export const isSessionExpiredError = (error: unknown): boolean => {
  if (!(error instanceof AxiosError)) return false;
  if (error.response?.status !== 401) return false;
  const url = error.config?.url;
  return !!url && url.startsWith('/api/me');
};

// One key set per middleware instance, so verifying the session JWT doesn't cost
// a round trip to the auth server on every request. The cache is bounded: keys
// are refetched once they are 5 minutes old, and a token signed with an unknown
// key id (rotation) triggers a refetch, at most every 30 seconds. A key the auth
// server withdraws therefore stops verifying within 5 minutes.
const JWKS_CACHE = { cacheMaxAge: 5 * 60_000, cooldownDuration: 30_000 };
let keySet: ReturnType<typeof createRemoteJWKSet> | undefined;
const getKeySet = () =>
  (keySet ??= createRemoteJWKSet(new URL(process.env.JWT_KEY_SET_URL!), JWKS_CACHE));

export const decodeJwtToken = async (token: string): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(token, getKeySet(), {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
  });
  return payload;
};
