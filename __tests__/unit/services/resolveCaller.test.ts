/**
 * @jest-environment node
 */
import { resolveCaller, resolveEntitlement } from '@/services/templateEntitlement';
import { getUserByToken } from '@/services/user';
import type { Template } from '@/types/template';

jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));

const asMock = (fn: unknown) => fn as jest.Mock;
const ADDRESS = '0x1111111111111111111111111111111111111111';

/**
 * The address comes from `user.address`, which console-api fills from the
 * `ethereum_address` claim of the session JWT -- /api/me will not answer
 * without that claim, and processOAuth looks the user up BY it, so it is
 * signature-verified rather than client-asserted.
 *
 * It used to be read off the Global Account sub-organisation, whose live
 * response is {subOrganizationId, isDeployed, hasPasskey, hasPhone,
 * emailVerified, providedSignerAddress, authenticators} -- no
 * smartContractAddress at all. ISubOrganization declared that field required,
 * so the compiler vouched for it; resolveCaller was jest.fn()-mocked in every
 * suite that touched it, so nothing exercised the real shape; and
 * /api/templates/[id] answered 401 to every user in production while the suite
 * stayed green. These tests exist so the caller's address has coverage that
 * does not depend on a mock of the thing under test.
 */
beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveCaller', () => {
  it('takes the address from the session user', async () => {
    asMock(getUserByToken).mockResolvedValue({ email: 'a@b.c', address: ADDRESS });

    const caller = await resolveCaller();

    expect(caller).toEqual({ address: ADDRESS, email: 'a@b.c' });
  });

  it('prefers the company owner email, as middleware does', async () => {
    asMock(getUserByToken).mockResolvedValue({
      email: 'member@b.c',
      company_email_owner: 'owner@b.c',
      address: ADDRESS,
    });

    expect((await resolveCaller())?.email).toBe('owner@b.c');
  });

  it('is still a caller when the session carries no address', async () => {
    asMock(getUserByToken).mockResolvedValue({ email: 'a@b.c' });

    // The regression: this returned null, and the route turned it into a 401.
    const caller = await resolveCaller();
    expect(caller).not.toBeNull();
    expect(caller?.address).toBeNull();
  });

  it('treats a blank address as absent rather than as an account', async () => {
    asMock(getUserByToken).mockResolvedValue({ email: 'a@b.c', address: '   ' });
    expect((await resolveCaller())?.address).toBeNull();
  });

  it('is not a caller when the session cannot be read', async () => {
    asMock(getUserByToken).mockRejectedValue(new Error('401'));
    expect(await resolveCaller()).toBeNull();
  });

  it('is not a caller when the session has no email', async () => {
    asMock(getUserByToken).mockResolvedValue({ address: ADDRESS });
    expect(await resolveCaller()).toBeNull();
  });
});

describe('entitlement for a caller with no address', () => {
  const template = (over: Partial<Template> = {}) =>
    ({
      id: 'toyota_camry_2020',
      deviceType: 'vehicle',
      manufacturer: { slug: 'toyota', name: 'Toyota', tokenId: 131 },
      model: 'Camry',
      year: 2020,
      attributes: {},
      trims: [{ name: 'LE', attributes: {} }],
      version: 3,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      ...over,
    }) as Template;

  const deps = (minted: number, owner: string | null) => ({
    id: 'toyota_camry_2020',
    countMintedVehicles: jest.fn().mockResolvedValue(minted),
    manufacturerOwner: jest
      .fn()
      .mockResolvedValue(
        owner ? { kind: 'found', owner, tokenId: 131 } : { kind: 'absent' },
      ),
    curators: ['0x3333333333333333333333333333333333333333'],
  });

  it('may edit an unowned template nothing references', async () => {
    const e = await resolveEntitlement({
      caller: null,
      template: template({ author: undefined }),
      ...deps(0, null),
    });
    expect(e.kind).toBe('author');
    expect(e.canPublish).toBe(true);
    expect(e.canSetHardwareTemplateId).toBe(false);
  });

  it('is never mistaken for a curator', async () => {
    const e = await resolveEntitlement({
      caller: null,
      template: template(),
      ...deps(5, null),
    });
    expect(e.kind).not.toBe('curator');
    expect(e.canSetHardwareTemplateId).toBe(false);
  });

  it('is never mistaken for the author of a claimed template', async () => {
    const e = await resolveEntitlement({
      caller: null,
      template: template({ author: '0x2222222222222222222222222222222222222222' }),
      ...deps(0, null),
    });
    expect(e.kind).toBe('proposal-required');
    expect(e.canPublish).toBe(false);
  });

  it('is never mistaken for the Manufacturer NFT holder', async () => {
    const e = await resolveEntitlement({
      caller: null,
      template: template(),
      ...deps(5, '0x2222222222222222222222222222222222222222'),
    });
    expect(e.canPublish).toBe(false);
  });
});
