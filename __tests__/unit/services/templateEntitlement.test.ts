/**
 * @jest-environment node
 */
import {
  IdentityError,
  countMintedVehicles,
  developerLicense,
  hardwareTemplateIdChanged,
  manufacturerOwner,
  resolveEntitlement,
  type DeveloperLicenseLookup,
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

const LICENSE: DeveloperLicenseLookup = {
  kind: 'held',
  tokenId: 472,
  alias: 'DEMO App',
  via: 'owner',
};
const NO_LICENSE: DeveloperLicenseLookup = { kind: 'none' };

const deps = (
  minted: number,
  owner: string | null,
  license: DeveloperLicenseLookup = LICENSE,
) => ({
  id: 'toyota_camry_2020',
  countMintedVehicles: jest.fn().mockResolvedValue(minted),
  manufacturerOwner: jest
    .fn()
    .mockResolvedValue(
      owner ? { kind: 'found', owner, tokenId: 131 } : { kind: 'absent' },
    ),
  developerLicense: jest.fn().mockResolvedValue(license),
  curators: [CURATOR],
});

describe('resolveEntitlement', () => {
  it('lets a developer license holder edit a template that vehicles already resolve to', async () => {
    // The regression this gate exists to end: 13 minted vehicles used to make
    // the row read-only to everyone but the Manufacturer NFT holder, waiting on
    // a proposal flow that is not built -- so the rows most in need of a fix
    // were the ones nobody could fix.
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(13, OTHER),
    });
    expect(e).toMatchObject({
      kind: 'licensed',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles: 13,
    });
    expect(e.reason).toContain('472');
    expect(e.reason).toContain('13 minted vehicles');
  });

  it('says how many cars a publish re-describes rather than refusing over it', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(300_000, OTHER),
    });
    expect(e).toMatchObject({ kind: 'licensed', canPublish: true });
    expect(e.reason).toContain('300,000');
    expect(e.reason).toMatch(/re-describes/);
  });

  it('counts one vehicle in the singular', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template(),
      ...deps(1, OTHER),
    });
    expect(e.reason).toContain('1 minted vehicle resolves');
  });

  it('lets a license holder create a template that does not exist', async () => {
    expect(
      await resolveEntitlement({ caller: CALLER, template: null, ...deps(0, OTHER) }),
    ).toMatchObject({
      kind: 'create',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles: 0,
    });
  });

  it('accepts a signer on a license, not only its owner', async () => {
    // Every other DIMO API treats an authorised signer as the license, so a
    // team whose signer key is the one in Console would otherwise be refused
    // by their own license.
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template(),
      ...deps(13, OTHER, { kind: 'held', tokenId: 472, alias: null, via: 'signer' }),
    });
    expect(e).toMatchObject({ kind: 'licensed', canPublish: true });
    expect(e.reason).toMatch(/signer on DIMO developer license 472/);
  });

  it('refuses an account with no developer license, and says how to get one', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template(),
      ...deps(0, OTHER, NO_LICENSE),
    });
    expect(e).toMatchObject({
      kind: 'license-required',
      canPublish: false,
      canSetHardwareTemplateId: false,
    });
    expect(e.reason).toMatch(/developer license/i);
  });

  it('refuses a session carrying no on-chain address', async () => {
    // developerLicense answers 'none' for a null address without asking
    // identity; the point here is that no tier above it lets such a caller
    // through -- eq() is false for null, so curator and manufacturer cannot
    // match either.
    const e = await resolveEntitlement({
      caller: null,
      template: template(),
      ...deps(0, OTHER, NO_LICENSE),
    });
    expect(e).toMatchObject({ kind: 'license-required', canPublish: false });
  });

  it('still lets the Manufacturer NFT holder in without a developer license', async () => {
    // Holding the make's NFT is a stronger claim on the row than any developer
    // license, so an OEM that never minted one is not locked out of its models.
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(4212, CALLER.toUpperCase(), NO_LICENSE),
    });
    expect(e).toMatchObject({
      kind: 'manufacturer',
      canPublish: true,
      mintedVehicles: 4212,
    });
  });

  it('gives a curator publish rights and the only hardwareTemplateId rights', async () => {
    const d = deps(4212, OTHER, NO_LICENSE);
    const e = await resolveEntitlement({
      caller: CURATOR,
      template: template({ author: OTHER }),
      ...d,
    });
    expect(e).toMatchObject({
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
    });
    // A curator is a curator whatever identity says about licenses, so the
    // round trip is not made.
    expect(d.developerLicense).not.toHaveBeenCalled();
  });

  it('publishes on an unreadable vehicle count, and says the count is unknown', async () => {
    // This used to fail closed, because the count decided the tier. It decides
    // nothing now, so an identity blip costs a number on a banner rather than
    // everyone's write access.
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(0, OTHER),
      countMintedVehicles: jest
        .fn()
        .mockRejectedValue(new IdentityError('identity-api: upstream timeout')),
    });
    expect(e).toMatchObject({
      kind: 'licensed',
      canPublish: true,
      mintedVehicles: null,
    });
    expect(e.reason).toMatch(/count could not be read/i);
  });

  it('fails closed when the developer license cannot be verified', async () => {
    // "We could not check your license" is not "you have no license": told
    // apart, because a licensed developer refused during an outage reads it as
    // a denial and goes to mint a second license.
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template(),
      ...deps(13, OTHER),
      developerLicense: jest
        .fn()
        .mockRejectedValue(new IdentityError('identity-api: upstream timeout')),
    });
    expect(e).toMatchObject({
      kind: 'unavailable',
      canPublish: false,
      canSetHardwareTemplateId: false,
      mintedVehicles: 13,
    });
    expect(e.reason).toMatch(/try again/i);
  });

  it('fails closed when an unlicensed caller cannot have the NFT holder looked up', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(4212, CALLER, NO_LICENSE),
      manufacturerOwner: jest
        .fn()
        .mockRejectedValue(new IdentityError('identity-api: upstream timeout')),
    });
    expect(e).toMatchObject({ kind: 'unavailable', canPublish: false });
  });

  describe('a definition whose template has not been imported', () => {
    it('counts the vehicles of the DEFINITION, not of the absent document', async () => {
      const d = deps(300_000, OTHER);
      const e = await resolveEntitlement({ caller: CALLER, template: null, ...d });
      expect(d.countMintedVehicles).toHaveBeenCalledWith('toyota_camry_2020');
      expect(e).toMatchObject({ kind: 'create', canPublish: true });
      expect(e.reason).toContain('300,000');
    });

    it('reads the make slug off the id for an unlicensed NFT holder', async () => {
      // There is no stored manufacturer to read the slug from, and the worker
      // requires manufacturer.slug to equal the make segment of the id, so the
      // id is as authoritative a source as the document would have been.
      const d = deps(300_000, CALLER, NO_LICENSE);
      const e = await resolveEntitlement({ caller: CALLER, template: null, ...d });
      expect(d.manufacturerOwner).toHaveBeenCalledWith('toyota');
      expect(e).toMatchObject({ kind: 'manufacturer', canPublish: true });
    });

    it('creates a genuinely new definition that nothing references', async () => {
      const e = await resolveEntitlement({
        caller: CALLER,
        template: null,
        ...deps(0, OTHER),
        id: 'ineos_grenadier_2024',
      });
      expect(e).toMatchObject({
        kind: 'create',
        canPublish: true,
        canSetHardwareTemplateId: false,
        mintedVehicles: 0,
      });
    });
  });

  it('never grants hardwareTemplateId rights to a non-curator, at any tier', async () => {
    for (const license of [LICENSE, NO_LICENSE]) {
      for (const t of [null, template({ author: CALLER })]) {
        const e = await resolveEntitlement({
          caller: CALLER,
          template: t,
          ...deps(0, CALLER, license),
        });
        expect(e.canSetHardwareTemplateId).toBe(false);
      }
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

describe('countMintedVehicles', () => {
  const reply = (status: number, body: unknown) => {
    const impl = jest.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    });
    global.fetch = impl as unknown as typeof fetch;
  };

  it('returns the count identity reports', async () => {
    reply(200, { data: { vehicles: { totalCount: 4212 } } });
    expect(await countMintedVehicles('toyota_camry_2020')).toBe(4212);
  });

  it('throws on a GraphQL error rather than reading it as zero vehicles', async () => {
    reply(200, { errors: [{ message: 'upstream timeout' }], data: null });
    await expect(countMintedVehicles('toyota_camry_2020')).rejects.toThrow(IdentityError);
    await expect(countMintedVehicles('toyota_camry_2020')).rejects.toThrow(
      'upstream timeout',
    );
  });

  it('throws when the response is not ok', async () => {
    reply(500, {});
    await expect(countMintedVehicles('toyota_camry_2020')).rejects.toThrow(IdentityError);
  });

  it('throws when data is missing, with or without errors', async () => {
    reply(200, { data: null });
    await expect(countMintedVehicles('toyota_camry_2020')).rejects.toThrow(IdentityError);
    reply(200, {});
    await expect(countMintedVehicles('toyota_camry_2020')).rejects.toThrow(IdentityError);
  });

  it('throws when the count is not a number', async () => {
    reply(200, { data: { vehicles: null } });
    await expect(countMintedVehicles('toyota_camry_2020')).rejects.toThrow(IdentityError);
  });
});

describe('manufacturerOwner', () => {
  const reply = (status: number, body: unknown) => {
    const impl = jest.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    });
    global.fetch = impl as unknown as typeof fetch;
  };

  // The contract this relies on, from identity-r2 ca4c4c3 and its
  // graph/schema/manufacturer.graphqls: `manufacturer(by: ManufacturerBy!):
  // Manufacturer` is NULLABLE, so a make nobody has minted is a normal answer --
  // HTTP 200, NO `errors` entry, and the `manufacturer` key present and null,
  // for every selector. A real failure carries an errors entry, whose message is
  // "Internal error" and never a driver string. So the two are told apart by the
  // PRESENCE of an errors entry, never by its text. Everything that is not the
  // absent shape fails closed: an absent key is a partial answer, not a denial.
  it('reads an explicit null manufacturer as "no such manufacturer"', async () => {
    reply(200, { data: { manufacturer: null } });
    expect(await manufacturerOwner('nosuchmake')).toEqual({ kind: 'absent' });
  });

  it('reads a manufacturer as the holder and the token id', async () => {
    reply(200, { data: { manufacturer: { owner: CALLER, tokenId: 131 } } });
    expect(await manufacturerOwner('toyota')).toEqual({
      kind: 'found',
      owner: CALLER,
      tokenId: 131,
    });
  });

  it('throws rather than reading a GraphQL error as an absent manufacturer', async () => {
    // A real outage reports errors. Treating that as absent would tell a
    // manufacturer their own make is not registered.
    reply(200, { errors: [{ message: 'Internal error' }], data: null });
    await expect(manufacturerOwner('toyota')).rejects.toThrow(IdentityError);
  });

  it('throws when the answer carries no manufacturer key at all', async () => {
    // `data.manufacturer ?? null` cannot tell this from an explicit null, and
    // the difference is a 422 naming the curator's make against a 503 telling
    // them to retry.
    reply(200, { data: {} });
    await expect(manufacturerOwner('toyota')).rejects.toThrow(IdentityError);
  });

  it('throws when the manufacturer it gets back is not one it can use', async () => {
    reply(200, { data: { manufacturer: { owner: CALLER } } });
    await expect(manufacturerOwner('toyota')).rejects.toThrow(IdentityError);
  });

  it('throws when the response is not ok', async () => {
    reply(503, {});
    await expect(manufacturerOwner('toyota')).rejects.toThrow(IdentityError);
  });
});

describe('developerLicense', () => {
  const reply = (status: number, body: unknown) => {
    const impl = jest.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    });
    global.fetch = impl as unknown as typeof fetch;
    return impl;
  };

  const conn = (nodes: unknown[]) => ({ totalCount: nodes.length, nodes });

  it('reads the license the caller owns', async () => {
    reply(200, {
      data: {
        owned: conn([{ tokenId: 472, alias: 'DEMO App' }]),
        signing: conn([]),
      },
    });
    expect(await developerLicense(CALLER)).toEqual({
      kind: 'held',
      tokenId: 472,
      alias: 'DEMO App',
      via: 'owner',
    });
  });

  it('falls through to a license the caller only signs for', async () => {
    reply(200, {
      data: { owned: conn([]), signing: conn([{ tokenId: 8, alias: null }]) },
    });
    expect(await developerLicense(CALLER)).toEqual({
      kind: 'held',
      tokenId: 8,
      alias: null,
      via: 'signer',
    });
  });

  it('reads two empty connections as "no license", which is a fact, not a failure', async () => {
    reply(200, { data: { owned: conn([]), signing: conn([]) } });
    expect(await developerLicense(CALLER)).toEqual({ kind: 'none' });
  });

  it('answers "no license" for a session with no address without asking identity', async () => {
    // An empty address would be a malformed query, which reads as "identity did
    // not answer" -- locking the caller behind a retry that can never succeed.
    const impl = reply(200, { data: { owned: conn([]), signing: conn([]) } });
    expect(await developerLicense(null)).toEqual({ kind: 'none' });
    expect(await developerLicense('')).toEqual({ kind: 'none' });
    expect(impl).not.toHaveBeenCalled();
  });

  it('throws rather than reading a GraphQL error as "no license"', async () => {
    reply(200, { errors: [{ message: 'Internal error' }], data: null });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
  });

  it('throws when either half of the question is missing from the answer', async () => {
    reply(200, { data: { owned: conn([]) } });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
    reply(200, { data: { signing: conn([]) } });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
    reply(200, { data: { owned: null, signing: conn([]) } });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
  });

  it('throws on a count it cannot read', async () => {
    reply(200, { data: { owned: { nodes: [] }, signing: conn([]) } });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
  });

  it('throws on a positive count with nothing to name', async () => {
    // The count alone would be enough to grant on, but then the banner would
    // name a token nobody can check -- and a partial answer is the shape a
    // degraded identity produces.
    reply(200, { data: { owned: { totalCount: 1, nodes: [] }, signing: conn([]) } });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
    reply(200, {
      data: { owned: { totalCount: 1, nodes: [{ alias: 'no id' }] }, signing: conn([]) },
    });
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
  });

  it('throws when the response is not ok', async () => {
    reply(503, {});
    await expect(developerLicense(CALLER)).rejects.toThrow(IdentityError);
  });
});
