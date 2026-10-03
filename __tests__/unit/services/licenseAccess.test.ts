/**
 * @jest-environment node
 */
import {
  ACCESS_CACHE_MAX,
  authorizeLicenseAccess,
  clearLicenseAccessCache,
  getLicenseAccess,
} from '@/services/licenseAccess';
import type { LicenseAccess } from '@/types/team';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims: Record<string, unknown>) =>
  [b64({ alg: 'none' }), b64(claims), 'sig'].join('.');
const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const EOA = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const SESSION = jwt({ ethereum_address: KERNEL });
const access = (over: Partial<LicenseAccess>): LicenseAccess => ({
  access: 'NONE',
  memberOfTeam: false,
  teamId: null,
  signerAddress: null,
  userEmail: 'sam@harness.dev',
  ...over,
});

describe('getLicenseAccess', () => {
  beforeEach(() => clearLicenseAccessCache());

  it('caches 60 s per session and client ID, any case, and never caches errors', async () => {
    let now = 1_000_000;
    const request = jest.fn(async () => access({}));
    const deps = { request, now: () => now };
    await getLicenseAccess('session-a', CLIENT, deps);
    await getLicenseAccess('session-a', CLIENT.toUpperCase().replace('0X', '0x'), deps);
    expect(request).toHaveBeenCalledTimes(1);
    now += 60_001;
    await getLicenseAccess('session-a', CLIENT, deps);
    expect(request).toHaveBeenCalledTimes(2);
    const failing = {
      request: jest
        .fn()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValue(access({})),
      now: () => now,
    };
    await expect(getLicenseAccess('session-c', CLIENT, failing)).rejects.toThrow('down');
    await getLicenseAccess('session-c', CLIENT, failing);
    expect(failing.request).toHaveBeenCalledTimes(2);
  });

  it(`holds at most ${ACCESS_CACHE_MAX} entries, evicting the oldest`, async () => {
    const request = jest.fn(async () => access({}));
    const deps = { request, now: () => 0 };
    for (let i = 0; i <= ACCESS_CACHE_MAX; i++)
      await getLicenseAccess(`s${i}`, CLIENT, deps);
    request.mockClear();
    await getLicenseAccess(`s${ACCESS_CACHE_MAX}`, CLIENT, deps);
    expect(request).not.toHaveBeenCalled();
    await getLicenseAccess('s0', CLIENT, deps);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('authorizeLicenseAccess', () => {
  const lookupAccess = jest.fn();
  const lookupOwner = jest.fn();
  const decide = (claims: Record<string, unknown>, enabled = true) =>
    authorizeLicenseAccess(
      { devJwt: jwt(claims), sessionToken: SESSION },
      { lookupAccess, lookupOwner, dataAccessEnabled: enabled },
    );
  beforeEach(() => {
    lookupAccess.mockReset();
    lookupOwner
      .mockReset()
      .mockResolvedValue('0x0000000000000000000000000000000000000002');
  });

  it('serves the license owner from Identity without asking console-api', async () => {
    lookupOwner.mockResolvedValue(KERNEL.toUpperCase().replace('0X', '0x'));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: true,
      access: 'OWNER',
      clientId: CLIENT,
      caller: { wallet: KERNEL },
    });
    expect(lookupAccess).not.toHaveBeenCalled();
  });

  it('falls back to console-api when Identity fails', async () => {
    lookupOwner.mockRejectedValue(new Error('identity down'));
    lookupAccess.mockResolvedValue(
      access({ access: 'OWNER', teamId: 't1', userEmail: 'jane@harness.dev' }),
    );
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: true,
      access: 'OWNER',
      clientId: CLIENT,
      caller: { email: 'jane@harness.dev', teamId: 't1' },
    });
  });

  it('allows a member whose JWT was signed by their registered wallet, any case', async () => {
    lookupAccess.mockResolvedValue(
      access({ access: 'MEMBER', memberOfTeam: true, teamId: 't2', signerAddress: EOA }),
    );
    await expect(
      decide({ ethereum_address: CLIENT, signer_address: EOA.toLowerCase() }),
    ).resolves.toEqual({
      allowed: true,
      access: 'MEMBER',
      clientId: CLIENT,
      caller: { email: 'sam@harness.dev', teamId: 't2' },
    });
  });

  it('refuses a member JWT without signer_address, from another wallet, or with the flag off', async () => {
    lookupAccess.mockResolvedValue(
      access({ access: 'MEMBER', memberOfTeam: true, teamId: 't2', signerAddress: EOA }),
    );
    for (const [claims, enabled] of [
      [{ ethereum_address: CLIENT }, true],
      [
        {
          ethereum_address: CLIENT,
          signer_address: '0x0000000000000000000000000000000000000001',
        },
        true,
      ],
      [{ ethereum_address: CLIENT, signer_address: EOA }, false],
    ] as const) {
      await expect(decide(claims, enabled)).resolves.toMatchObject({
        allowed: false,
        status: 403,
        code: 'NO_ACCESS',
      });
    }
  });

  it('tells a member without a key apart from someone no longer in the team', async () => {
    lookupAccess.mockResolvedValueOnce(access({ memberOfTeam: true }));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      code: 'NO_ACCESS',
      memberOfTeam: true,
    });
    lookupAccess.mockResolvedValueOnce(access({ memberOfTeam: false }));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: false,
      status: 403,
      code: 'NO_ACCESS',
      message: 'You no longer have access to this license.',
      memberOfTeam: false,
    });
  });

  it("passes console-api's INVALID_CLIENT_ID through and fails closed otherwise", async () => {
    lookupAccess.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'INVALID_CLIENT_ID' }),
    );
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      status: 400,
      code: 'INVALID_CLIENT_ID',
    });
    lookupAccess.mockRejectedValueOnce(new Error('timeout'));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      status: 503,
      code: 'ACCESS_CHECK_FAILED',
    });
  });

  it('answers 401 for an unreadable developer JWT or a missing session', async () => {
    await expect(
      authorizeLicenseAccess(
        { devJwt: 'garbage', sessionToken: SESSION },
        { lookupAccess, lookupOwner },
      ),
    ).resolves.toMatchObject({ status: 401, code: 'DEV_JWT_INVALID' });
    await expect(
      authorizeLicenseAccess(
        { devJwt: jwt({ ethereum_address: CLIENT }), sessionToken: null },
        { lookupAccess, lookupOwner },
      ),
    ).resolves.toMatchObject({ status: 401, code: 'NO_ACCESS' });
  });
});
