import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose';

export const isIn = (url: string) => (path: string) => url.startsWith(path);

export const decodeJwtToken = async (token: string): Promise<JWTPayload> => {
  const jwks = createRemoteJWKSet(new URL(process.env.JWT_KEY_SET_URL!));
  const { payload } = await jwtVerify(token, jwks, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
  });
  return payload;
};
