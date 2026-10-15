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

// Failures that say the token itself is no good: expired, signed by a key the
// auth server never issued, malformed, or for another issuer. Such a cookie is
// no session at all. Anything else (the key set could not be fetched, say) is
// an outage, not a verdict on the token, and is left to the caller.
const INVALID_TOKEN_CODES = new Set([
  'ERR_JWT_EXPIRED',
  'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JWT_INVALID',
  'ERR_JWS_INVALID',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JWKS_NO_MATCHING_KEY',
  'ERR_JOSE_ALG_NOT_ALLOWED',
]);

export const isInvalidTokenError = (error: unknown): boolean =>
  INVALID_TOKEN_CODES.has((error as { code?: string } | null)?.code ?? '');

// The middleware checks that a signed-in user has finished onboarding by asking
// console-api (/api/me) and the accounts API who they are. That costs two
// sequential round trips -- 300-450ms warm, seconds cold -- and it ran on every
// navigation, prefetch, server action and API call. Once a session passes, the
// answer is remembered in this cookie for a while, and requests carrying it
// skip both lookups.
//
// The cookie holds a digest of the session token it was issued for, so it ends
// with that session and cannot be carried to another. It is not a security
// boundary: it only spares the onboarding redirect, and every request for data
// is still authorised by console-api against the session token itself.
export const SESSION_VERDICT_COOKIE = 'session-verdict';
export const SESSION_VERDICT_MAX_AGE = 15 * 60;

export const sessionVerdictFor = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};
