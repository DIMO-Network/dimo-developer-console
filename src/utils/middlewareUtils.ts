import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose';

export const isIn = (url: string) => (path: string) => url.startsWith(path);

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
