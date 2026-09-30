/**
 * @jest-environment node
 */
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'key-set'),
  jwtVerify: jest.fn(async () => ({ payload: { sub: 'user' } })),
}));

describe('decodeJwtToken', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_KEY_SET_URL = 'https://auth.test/keys';
    process.env.JWT_ISSUER = 'https://auth.test';
  });

  it('builds the key set once and reuses it across requests', async () => {
    const { decodeJwtToken } = await import('@/utils/middlewareUtils');
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    await decodeJwtToken('a.b.c');
    await decodeJwtToken('d.e.f');
    await decodeJwtToken('g.h.i');
    expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
    // Bounded, not infinite: keys expire after 5 minutes, and an unknown key id
    // (rotation) refetches at most every 30 seconds.
    expect(createRemoteJWKSet).toHaveBeenCalledWith(new URL('https://auth.test/keys'), {
      cacheMaxAge: 5 * 60_000,
      cooldownDuration: 30_000,
    });
    expect(jwtVerify).toHaveBeenCalledTimes(3);
    expect(jwtVerify).toHaveBeenLastCalledWith('g.h.i', 'key-set', {
      algorithms: ['RS256'],
      issuer: 'https://auth.test',
    });
  });

  it('returns the verified payload', async () => {
    const { decodeJwtToken } = await import('@/utils/middlewareUtils');
    await expect(decodeJwtToken('a.b.c')).resolves.toEqual({ sub: 'user' });
  });
});
