/**
 * @jest-environment node
 */
import {
  resolveEntitlement,
  type DeveloperLicenseLookup,
  type EntitlementArgs,
} from '@/services/templateEntitlement';
import type { Template } from '@/types/template';

const CALLER = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';

const TOYOTA = {
  id: 'toyota_camry_2020',
  manufacturer: { slug: 'toyota', name: 'Toyota', tokenId: 131 },
} as Template;

const held = (over: Partial<DeveloperLicenseLookup> = {}): DeveloperLicenseLookup =>
  ({
    kind: 'held',
    tokenId: 472,
    alias: 'DEMO App',
    via: 'owner',
    ...over,
  }) as DeveloperLicenseLookup;

const args = (
  over: Partial<EntitlementArgs> & { minted?: number | null },
): EntitlementArgs => {
  const { minted = 0, ...rest } = over;
  return {
    caller: CALLER,
    id: 'toyota_camry_2020',
    template: TOYOTA,
    countMintedVehicles:
      minted === null
        ? jest.fn().mockRejectedValue(new Error('down'))
        : jest.fn().mockResolvedValue(minted),
    manufacturerOwner: jest
      .fn()
      .mockResolvedValue({ kind: 'found', owner: OTHER, tokenId: 131 }),
    developerLicense: jest.fn().mockResolvedValue(held()),
    curators: [],
    ...rest,
  };
};

const down = () => jest.fn().mockRejectedValue(new Error('down'));

// The English reason is what the API answers a refused write with, so it must
// read exactly as it did before the reason moved into messages.
describe('the English entitlement reason', () => {
  it.each<[string, Partial<EntitlementArgs> & { minted?: number | null }, string]>([
    [
      'curator',
      { curators: [CALLER], minted: 13 },
      "You're a DIMO curator, so nothing here is locked for you. 13 cars already use it, so publishing changes how all of them are described.",
    ],
    [
      'license unavailable',
      { developerLicense: down() },
      "We couldn't check your DIMO developer license just now, so nothing is editable. Reload in a moment and it should clear.",
    ],
    [
      'create, owner with alias, no cars',
      { template: null },
      "You hold DIMO developer license #472, DEMO App. Nothing has been published for this model year yet, so you're writing the first one.",
    ],
    [
      'create, signer, unknown count',
      {
        template: null,
        minted: null,
        developerLicense: jest
          .fn()
          .mockResolvedValue(held({ alias: null, via: 'signer' })),
      },
      "You sign for DIMO developer license #472. Nothing has been published for this model year yet, so you're writing the first one. We couldn't check how many cars use this definition, so assume some are already on the road.",
    ],
    [
      'licensed, one car',
      { minted: 1 },
      "You hold DIMO developer license #472, DEMO App, and that's all it takes to publish changes here. One car already uses it, so publishing changes how that car is described.",
    ],
    [
      'licensed signer, no cars, large token id',
      {
        developerLicense: jest
          .fn()
          .mockResolvedValue(held({ tokenId: 12345, alias: null, via: 'signer' })),
      },
      "You sign for DIMO developer license #12345, and that's all it takes to publish changes here. No cars use it yet.",
    ],
    [
      'manufacturer unavailable',
      {
        developerLicense: jest.fn().mockResolvedValue({ kind: 'none' }),
        manufacturerOwner: down(),
      },
      "We couldn't check who holds the Manufacturer NFT for this make just now. Reload in a moment and it should clear.",
    ],
    [
      'manufacturer',
      {
        minted: 300_000,
        developerLicense: jest.fn().mockResolvedValue({ kind: 'none' }),
        manufacturerOwner: jest
          .fn()
          .mockResolvedValue({ kind: 'found', owner: CALLER, tokenId: 1310 }),
      },
      'You hold the Toyota Manufacturer NFT (#1310), so this make is yours to edit. 300,000 cars already use it, so publishing changes how all of them are described.',
    ],
    [
      'license required',
      { developerLicense: jest.fn().mockResolvedValue({ kind: 'none' }) },
      "Editing a template takes a DIMO developer license, and this account doesn't hold one or sign for one. Create one under Developer licenses, then reload this page.",
    ],
  ])('%s', async (_, over, reason) => {
    expect((await resolveEntitlement(args(over))).reason).toBe(reason);
  });

  it('carries the facts the banner translates', async () => {
    expect((await resolveEntitlement(args({ minted: 2 }))).reasonDetail).toEqual({
      key: 'licensed',
      via: 'owner',
      tokenId: 472,
      alias: 'DEMO App',
    });
  });
});
