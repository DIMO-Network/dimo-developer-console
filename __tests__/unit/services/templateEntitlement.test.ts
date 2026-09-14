/**
 * @jest-environment node
 */
import {
  hardwareTemplateIdChanged,
  resolveEntitlement,
} from '@/services/templateEntitlement';
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

describe('hardwareTemplateIdChanged', () => {
  const trim = (name: string, hardwareTemplateId?: string) => ({
    name,
    ...(hardwareTemplateId ? { hardwareTemplateId } : {}),
    attributes: {},
  });
  const stored = template({
    hardwareTemplateId: '130',
    trims: [trim('LE', '130'), trim('XLE')],
  });
  const submit = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    hardwareTemplateId: '130',
    trims: [trim('LE', '130'), trim('XLE')],
    ...over,
  });

  it('is quiet when nothing moved', () => {
    expect(hardwareTemplateIdChanged(submit(), stored)).toBe(false);
  });

  it('sees a top-level change', () => {
    expect(hardwareTemplateIdChanged(submit({ hardwareTemplateId: '999' }), stored)).toBe(
      true,
    );
    expect(
      hardwareTemplateIdChanged(submit({ hardwareTemplateId: undefined }), stored),
    ).toBe(true);
  });

  it('sees a per-trim change under an unchanged top-level value', () => {
    expect(
      hardwareTemplateIdChanged(
        submit({ trims: [trim('LE', '999'), trim('XLE')] }),
        stored,
      ),
    ).toBe(true);
  });

  it('sees a value arriving on a trim the stored template does not carry one for', () => {
    expect(
      hardwareTemplateIdChanged(
        submit({ trims: [trim('LE', '130'), trim('XLE', '130')] }),
        stored,
      ),
    ).toBe(true);
    expect(
      hardwareTemplateIdChanged(
        submit({ trims: [trim('LE', '130'), trim('XLE'), trim('SE', '130')] }),
        stored,
      ),
    ).toBe(true);
  });

  it('sees a stored per-trim value going away, whether the field or the whole trim goes', () => {
    expect(
      hardwareTemplateIdChanged(submit({ trims: [trim('LE'), trim('XLE')] }), stored),
    ).toBe(true);
    expect(hardwareTemplateIdChanged(submit({ trims: [trim('XLE')] }), stored)).toBe(
      true,
    );
    // A rename is a removal plus an arrival: the value now sits on a trim the
    // stored template never had.
    expect(
      hardwareTemplateIdChanged(
        submit({ trims: [trim('LE Hybrid', '130'), trim('XLE')] }),
        stored,
      ),
    ).toBe(true);
  });

  it('ignores trims that come, go or are renamed without one', () => {
    expect(
      hardwareTemplateIdChanged(
        submit({ trims: [trim('LE', '130'), trim('SE'), trim('TRD')] }),
        stored,
      ),
    ).toBe(false);
    expect(
      hardwareTemplateIdChanged(submit({ trims: [trim('LE', '130')] }), stored),
    ).toBe(false);
  });

  it('does not let a duplicated trim name hide a change', () => {
    expect(
      hardwareTemplateIdChanged(
        submit({ trims: [trim('LE', '999'), trim('LE', '130'), trim('XLE')] }),
        stored,
      ),
    ).toBe(true);
  });

  it('treats any value as a change against a template that does not exist yet', () => {
    expect(hardwareTemplateIdChanged({ trims: [trim('LE')] }, null)).toBe(false);
    expect(
      hardwareTemplateIdChanged({ hardwareTemplateId: '130', trims: [trim('LE')] }, null),
    ).toBe(true);
    expect(hardwareTemplateIdChanged({ trims: [trim('LE', '130')] }, null)).toBe(true);
  });

  it('leaves a malformed trims field to the worker rather than crashing on it', () => {
    const bare = template({ trims: [trim('LE')] });
    expect(hardwareTemplateIdChanged({ trims: 'nope' }, bare)).toBe(false);
    expect(hardwareTemplateIdChanged({ trims: [null, 'LE', 7] }, bare)).toBe(false);
    // ...unless a stored value would silently vanish behind it.
    expect(hardwareTemplateIdChanged({ trims: 'nope' }, stored)).toBe(true);
  });
});
