/**
 * @jest-environment node
 */
import { resolveEntitlement } from '@/services/templateEntitlement';
import type { Template } from '@/types/template';

const CALLER = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';
const CURATOR = '0x3333333333333333333333333333333333333333';

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
  countMintedVehicles: jest.fn().mockResolvedValue(minted),
  manufacturerOwner: jest.fn().mockResolvedValue(owner ? { owner, tokenId: 131 } : null),
  curators: [CURATOR],
});

describe('resolveEntitlement', () => {
  it('lets any signed-in account create a template that does not exist', async () => {
    expect(
      await resolveEntitlement({ caller: CALLER, template: null, ...deps(0, OTHER) }),
    ).toMatchObject({
      kind: 'create',
      canPublish: true,
      canSetHardwareTemplateId: false,
    });
  });

  it('lets the author edit an unreferenced template', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: CALLER }),
      ...deps(0, OTHER),
    });
    expect(e).toMatchObject({ kind: 'author', canPublish: true });
  });

  it('treats an unauthored backfill template as unowned while nothing references it', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template(),
      ...deps(0, OTHER),
    });
    expect(e).toMatchObject({ kind: 'author', canPublish: true });
  });

  it('requires a proposal to edit somebody else unreferenced template', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(0, OTHER),
    });
    expect(e).toMatchObject({ kind: 'proposal-required', canPublish: false });
  });

  it('lets the manufacturer NFT holder edit a template with minted vehicles', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(4212, CALLER.toUpperCase()),
    });
    expect(e).toMatchObject({
      kind: 'manufacturer',
      canPublish: true,
      mintedVehicles: 4212,
    });
  });

  it('requires a proposal for everyone else once vehicles are minted, and says how many', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: CALLER }),
      ...deps(4212, OTHER),
    });
    expect(e).toMatchObject({
      kind: 'proposal-required',
      canPublish: false,
      mintedVehicles: 4212,
    });
  });

  it('gives a curator publish rights and the only hardwareTemplateId rights', async () => {
    const e = await resolveEntitlement({
      caller: CURATOR,
      template: template({ author: OTHER }),
      ...deps(4212, OTHER),
    });
    expect(e).toMatchObject({
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
    });
  });

  it('never grants hardwareTemplateId rights to a non-curator, at any tier', async () => {
    for (const t of [null, template({ author: CALLER })]) {
      const e = await resolveEntitlement({
        caller: CALLER,
        template: t,
        ...deps(0, CALLER),
      });
      expect(e.canSetHardwareTemplateId).toBe(false);
    }
  });
});
