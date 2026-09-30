/**
 * @jest-environment node
 */
import {
  getSubjectJwt,
  SubjectJwtError,
  clearSubjectJwtCache,
} from '@/services/subjectJwt';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload: object) => `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
const future = Math.floor(Date.now() / 1000) + 3600;
const DEV = jwt({
  ethereum_address: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  exp: future,
});
const VEHICLE = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231';
const ACCOUNT = 'did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
// Permission pairs set (0b11): 1 NonLocation, 2 Commands, 3 CurrentLoc, 4 LocHistory, 7 RawData
const PERMS_HEX =
  '0x' + ((3n << 2n) | (3n << 4n) | (3n << 6n) | (3n << 8n) | (3n << 14n)).toString(16);

const fetchMock = jest.fn();
beforeEach(() => {
  clearSubjectJwtCache();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('getSubjectJwt', () => {
  it('exchanges a vehicle DID with the permissions the license holds', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        json(200, { data: { vehicle: { sacd: { permissions: PERMS_HEX } } } }),
      )
      .mockImplementationOnce(() => json(200, { token: 'vehicle-jwt' }));

    await expect(getSubjectJwt(DEV, VEHICLE)).resolves.toBe('vehicle-jwt');

    const [, exchangeCall] = fetchMock.mock.calls;
    expect(JSON.parse(exchangeCall[1].body)).toEqual({
      asset: VEHICLE,
      permissions: [
        'privilege:GetNonLocationHistory',
        'privilege:ExecuteCommands',
        'privilege:GetCurrentLocation',
        'privilege:GetLocationHistory',
        'privilege:GetRawData',
      ],
    });
    expect(exchangeCall[1].headers.Authorization).toBe(`Bearer ${DEV}`);
  });

  it('exchanges an account DID for raw data only, without an identity lookup', async () => {
    fetchMock.mockImplementationOnce(() => json(200, { token: 'account-jwt' }));
    await expect(getSubjectJwt(DEV, ACCOUNT)).resolves.toBe('account-jwt');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      asset: ACCOUNT,
      permissions: ['privilege:GetRawData'],
    });
  });

  it('caches per developer JWT and asset until close to expiry', async () => {
    const soon = jwt({ exp: Math.floor(Date.now() / 1000) + 600 });
    fetchMock.mockImplementationOnce(() => json(200, { token: soon }));
    await getSubjectJwt(DEV, ACCOUNT);
    await getSubjectJwt(DEV, ACCOUNT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not serve a cached token to a different JWT with the same address', async () => {
    fetchMock.mockImplementationOnce(() => json(200, { token: 'victim-jwt' }));
    await getSubjectJwt(DEV, ACCOUNT);
    const forged = jwt({
      ethereum_address: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
      exp: future + 1,
    });
    fetchMock.mockImplementationOnce(() => json(401, {}));
    await expect(getSubjectJwt(forged, ACCOUNT)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('answers 403 NOT_SHARED when the vehicle has no SACD for the license', async () => {
    fetchMock.mockImplementationOnce(() =>
      json(200, { data: { vehicle: { sacd: null } } }),
    );
    await expect(getSubjectJwt(DEV, VEHICLE)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_SHARED',
    });
  });

  it('answers 403 NOT_SHARED when token exchange refuses', async () => {
    fetchMock.mockImplementationOnce(() => json(403, { message: 'no grant' }));
    await expect(getSubjectJwt(DEV, ACCOUNT)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_SHARED',
    });
  });

  it('answers 401 DEV_JWT_INVALID for an expired or malformed developer JWT', async () => {
    const expired = jwt({ ethereum_address: '0xabc', exp: 1 });
    await expect(getSubjectJwt(expired, ACCOUNT)).rejects.toMatchObject({ status: 401 });
    await expect(getSubjectJwt('not-a-jwt', ACCOUNT)).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 502 UPSTREAM on other failures', async () => {
    fetchMock.mockImplementation(() => json(500, 'boom'));
    await expect(getSubjectJwt(DEV, ACCOUNT)).rejects.toBeInstanceOf(SubjectJwtError);
    await expect(getSubjectJwt(DEV, ACCOUNT)).rejects.toMatchObject({ status: 502 });
  });

  it('shares one exchange between concurrent calls for the same asset', async () => {
    let release!: (r: Response) => void;
    const gate = new Promise<Response>((resolve) => (release = resolve));
    fetchMock.mockImplementationOnce(() => gate);
    const a = getSubjectJwt(DEV, ACCOUNT);
    const b = getSubjectJwt(DEV, ACCOUNT);
    release(new Response(JSON.stringify({ token: 'shared-jwt' }), { status: 200 }));
    await expect(Promise.all([a, b])).resolves.toEqual(['shared-jwt', 'shared-jwt']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares the identity lookup and exchange for concurrent vehicle calls', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        json(200, { data: { vehicle: { sacd: { permissions: PERMS_HEX } } } }),
      )
      .mockImplementationOnce(() => json(200, { token: 'vehicle-jwt' }));
    await expect(
      Promise.all([getSubjectJwt(DEV, VEHICLE), getSubjectJwt(DEV, VEHICLE)]),
    ).resolves.toEqual(['vehicle-jwt', 'vehicle-jwt']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not keep a failed exchange: the next call tries again', async () => {
    fetchMock
      .mockImplementationOnce(() => json(500, {}))
      .mockImplementationOnce(() => json(200, { token: 'second-try' }));
    const [first, second] = await Promise.allSettled([
      getSubjectJwt(DEV, ACCOUNT),
      getSubjectJwt(DEV, ACCOUNT),
    ]);
    expect(first.status).toBe('rejected');
    expect(second.status).toBe('rejected');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(getSubjectJwt(DEV, ACCOUNT)).resolves.toBe('second-try');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a vehicle on another chain', VEHICLE.replace(':80002:', ':137:')],
    [
      'an NFT from another contract',
      'did:erc721:80002:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:190231',
    ],
    ['an account on another chain', ACCOUNT.replace(':80002:', ':137:')],
  ])('refuses %s without calling out', async (_what, asset) => {
    await expect(getSubjectJwt(DEV, asset)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_SHARED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an asset that is neither an erc721 nor an ethr DID', async () => {
    await expect(getSubjectJwt(DEV, 'did:web:example.com')).rejects.toMatchObject({
      status: 403,
    });
  });
});
