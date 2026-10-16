import config from '@/config';
import { fetchWithTimeout, isTimeout } from '@/utils/fetchWithTimeout';
import type { Template } from '@/types/template';
import { getUserByToken } from '@/services/user';

export type EntitlementKind =
  | 'create'
  /** Holds (or signs for) a DIMO developer license, which is what publishing takes. */
  | 'licensed'
  | 'manufacturer'
  | 'curator'
  /** No developer license, so there is nothing to publish with. */
  | 'license-required'
  /** identity-api could not answer something the decision needs, so nothing is decided. */
  | 'unavailable';

export interface Entitlement {
  kind: EntitlementKind;
  canPublish: boolean;
  /** DIMO only, at every tier. It decides what hardware ships. */
  canSetHardwareTemplateId: boolean;
  /**
   * How many vehicles resolve to the definition. null when identity-api did not
   * answer -- an unknown count is not zero. Since the developer licence became
   * the gate this number decides nothing; it is shown so an editor knows how
   * many cars a publish re-describes.
   */
  mintedVehicles: number | null;
  reason: string;
}

/** identity-api did not give a usable answer: transport, GraphQL or an empty body. */
export class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityError';
  }
}

const eq = (a?: string | null, b?: string | null) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export const curatorAddresses = (): string[] =>
  (process.env.DIMO_CURATOR_ADDRESSES ?? '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);

/**
 * The caller, from the session Console already has. The address is
 * `user.address`, which dimo-developer-console-api fills from the
 * `ethereum_address` claim of the session JWT: /api/me refuses to answer at all
 * without that claim (hasMandatoryInformation), and processOAuth looks the user
 * up BY it, so it is signature-verified rather than anything a client asserts.
 * console-api treats it as the on-chain caller itself -- assertOwnsWorkspace
 * compares it against workspace.owner and 403s on a mismatch -- which is the
 * same question entitlement asks about a Manufacturer NFT.
 *
 * This used to read `smartContractAddress` off the Global Account
 * sub-organisation instead, and that field does not exist. GET
 * /api/account/<email> answers 200 with {subOrganizationId, isDeployed,
 * hasPasskey, hasPhone, emailVerified, providedSignerAddress, authenticators} --
 * no smartContractAddress, no walletAddress, providedSignerAddress null. The
 * address the rest of Console uses is derived CLIENT-side in
 * GlobalAccountProvider as `kernelAccount.address`, from a Turnkey session only
 * the browser holds, so it was never reachable here. ISubOrganization declared
 * the field required, so the compiler vouched for it, and every
 * /api/templates/[id] request answered 401 to every user in production.
 *
 * getUserByToken was already being called for the email; the address was in
 * that same response the whole time.
 *
 * `address` stays nullable so a session that somehow carries no address is a
 * narrowing rather than a lockout: every identity-dependent tier (curator,
 * claimed author, Manufacturer NFT holder) compares through `eq`, which is
 * false for null, so such a caller reaches only the tiers that depend on no
 * identity at all and can never be mistaken for a curator or a manufacturer.
 */
export async function resolveCaller(): Promise<{
  address: `0x${string}` | null;
  email: string;
} | null> {
  try {
    const user = await getUserByToken();
    const email = user.company_email_owner ?? user.email;
    if (!email) return null;
    const address = typeof user.address === 'string' ? user.address.trim() : '';
    return {
      address: address === '' ? null : (address as `0x${string}`),
      email,
    };
  } catch {
    return null;
  }
}

/**
 * A GraphQL failure arrives as HTTP 200 with `errors` set and `data` null.
 * Every way identity can fail to answer is thrown here, never returned: a
 * caller reading `data` as an answer would turn "unknown" into a value, and
 * for the vehicle count that value would be zero -- the open tier.
 */
async function identity<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  let resp: Response;
  try {
    resp = await fetchWithTimeout(
      config.identityApiUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
      },
      { label: 'identity-api' },
    );
  } catch (err) {
    // A timeout IS identity failing to answer, so it has to arrive as an
    // IdentityError like every other way of failing to answer. Letting a
    // TimeoutError escape instead would skip resolveEntitlement's
    // 'unavailable' state -- the one that means "nothing was decided, retry"
    // and answers 503 -- and surface as a flat 502 for a condition that is
    // very often transient.
    if (isTimeout(err)) throw new IdentityError(err.message);
    throw err;
  }
  if (!resp.ok) throw new IdentityError(`identity-api returned ${resp.status}`);
  const json = (await resp.json()) as {
    data?: T | null;
    errors?: { message?: string }[];
  };
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const messages = json.errors.map((e) => e.message ?? 'unknown error');
    throw new IdentityError(`identity-api: ${messages.join('; ')}`);
  }
  if (json.data === null || json.data === undefined) {
    throw new IdentityError('identity-api returned no data');
  }
  return json.data;
}

/** How many vehicles point at this template. This is the number that decides risk. */
export async function countMintedVehicles(id: string): Promise<number> {
  const data = await identity<{ vehicles: { totalCount: number } | null }>(
    `query TemplateVehicles($id: String!) {
       vehicles(filterBy: { deviceDefinitionId: $id }, first: 1) { totalCount }
     }`,
    { id },
  );
  const count = data.vehicles?.totalCount;
  if (typeof count !== 'number') {
    throw new IdentityError('identity-api returned no vehicle count');
  }
  return count;
}

/**
 * Whether identity knows a manufacturer under this slug, stated so that "there
 * is no such manufacturer" cannot be confused with "identity did not answer".
 * The first is a fact the curator can act on -- their make has not been minted,
 * which is a 422 naming the slug. The second is a 503 and a retry. Conflating
 * them either tells a manufacturer their own make does not exist during an
 * outage, or hides a real unregistered slug behind "try again" forever.
 */
export type ManufacturerLookup =
  | { kind: 'found'; owner: string; tokenId: number }
  | { kind: 'absent' };

/**
 * identity's contract, from graph/schema/manufacturer.graphqls:
 *
 *   manufacturer(by: ManufacturerBy!): Manufacturer
 *
 * The field is NULLABLE, so a slug nobody has minted is a normal answer and
 * not a failure: HTTP 200, no `errors` entry, and `data.manufacturer` present
 * and null. That, and only that, is "absent".
 *
 * Everything else fails closed and throws. `data.manufacturer ?? null` did not:
 * it read an absent key -- a partial or unrecognised answer -- as a denial, and
 * it is the key being absent rather than null that a degraded identity
 * produces. The errors-first check in identity() covers the rest.
 */
export async function manufacturerOwner(slug: string): Promise<ManufacturerLookup> {
  const data = await identity<{
    manufacturer?: { owner?: unknown; tokenId?: unknown } | null;
  }>(
    `query TemplateManufacturer($slug: String!) {
       manufacturer(by: { slug: $slug }) { owner tokenId }
     }`,
    { slug },
  );
  if (!('manufacturer' in data)) {
    throw new IdentityError('identity-api returned no manufacturer field');
  }
  const held = data.manufacturer;
  if (held === null || held === undefined) return { kind: 'absent' };
  if (typeof held.owner !== 'string' || typeof held.tokenId !== 'number') {
    throw new IdentityError(
      'identity-api returned a manufacturer with no owner or token id',
    );
  }
  return { kind: 'found', owner: held.owner, tokenId: held.tokenId };
}

/**
 * Whether this address holds a DIMO developer license, which is what the editor
 * now gates on. Told apart the same way the manufacturer lookup is: "identity
 * answered, and the answer is no license" is a fact the person can act on --
 * mint one -- while "identity did not answer" is a retry, and conflating the
 * two tells a licensed developer they have no license during an outage.
 *
 * Both halves of the question are asked, because both are the license: the
 * owner of the NFT and the signers it authorises are equally the license
 * holder as far as every other DIMO API is concerned, and a team whose signer
 * key is in Console would otherwise be refused by their own license.
 */
export type DeveloperLicenseLookup =
  | { kind: 'held'; tokenId: number; alias: string | null; via: 'owner' | 'signer' }
  | { kind: 'none' };

interface LicenseConnection {
  totalCount?: unknown;
  nodes?: unknown;
}

const firstLicense = (
  conn: LicenseConnection | null | undefined,
  via: 'owner' | 'signer',
): DeveloperLicenseLookup => {
  if (conn === null || conn === undefined) {
    throw new IdentityError('identity-api returned no developer license connection');
  }
  if (typeof conn.totalCount !== 'number') {
    throw new IdentityError('identity-api returned no developer license count');
  }
  if (conn.totalCount === 0) return { kind: 'none' };
  const node = Array.isArray(conn.nodes) ? conn.nodes[0] : undefined;
  // A positive count with no node is a partial answer, not a license: the
  // count alone is enough to grant on, but then the reason would name a token
  // nobody can check. Fail closed and let the caller retry.
  if (typeof node !== 'object' || node === null) {
    throw new IdentityError('identity-api returned a developer license with no node');
  }
  const { tokenId, alias } = node as { tokenId?: unknown; alias?: unknown };
  if (typeof tokenId !== 'number') {
    throw new IdentityError('identity-api returned a developer license with no token id');
  }
  return { kind: 'held', tokenId, alias: typeof alias === 'string' ? alias : null, via };
};

export async function developerLicense(
  address: string | null,
): Promise<DeveloperLicenseLookup> {
  // No on-chain address on the session is not an outage and not a license: see
  // resolveCaller. Asking identity about an empty address would be a malformed
  // query, which would read as "identity did not answer" and lock the caller
  // behind a retry that can never succeed.
  if (!address) return { kind: 'none' };
  const data = await identity<{
    owned?: LicenseConnection | null;
    signing?: LicenseConnection | null;
  }>(
    `query TemplateDeveloperLicense($address: Address!) {
       owned: developerLicenses(filterBy: { owner: $address }, first: 1) {
         totalCount
         nodes { tokenId alias }
       }
       signing: developerLicenses(filterBy: { signer: $address }, first: 1) {
         totalCount
         nodes { tokenId alias }
       }
     }`,
    { address },
  );
  if (!('owned' in data) || !('signing' in data)) {
    throw new IdentityError('identity-api returned no developer license fields');
  }
  const owned = firstLicense(data.owned, 'owner');
  if (owned.kind === 'held') return owned;
  return firstLicense(data.signing, 'signer');
}

/**
 * Every (trim name, hardwareTemplateId) pair a template carries, as a sorted
 * multiset. Trims without one do not appear: adding, removing or renaming
 * those is vehicle description, not a hardware decision. A pair is kept per
 * occurrence, so a duplicated trim name cannot hide one value behind another.
 */
const trimHardware = (trims: unknown): string[] => {
  if (!Array.isArray(trims)) return [];
  return trims
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .filter((t) => t.hardwareTemplateId !== undefined)
    .map((t) => JSON.stringify([t.name, t.hardwareTemplateId]))
    .sort();
};

/**
 * Whether `submitted` would change a hardwareTemplateId anywhere on the
 * template: the top-level default or any trim override. The worker accepts the
 * field on both, so a gate that reads only the top-level one is open on every
 * trim. A stored template of `null` is a create, against which any value at
 * all is a change. The body is raw JSON and is not trusted to be well-formed:
 * anything that is not a trim object is skipped and left to the worker's
 * validator.
 */
export function hardwareTemplateIdChanged(
  submitted: Record<string, unknown>,
  stored: Pick<Template, 'hardwareTemplateId' | 'trims'> | null,
): boolean {
  if (submitted.hardwareTemplateId !== stored?.hardwareTemplateId) return true;
  const before = trimHardware(stored?.trims);
  const after = trimHardware(submitted.trims);
  return before.length !== after.length || before.some((pair, i) => pair !== after[i]);
}

export interface EntitlementArgs {
  /** null when the session carries no on-chain address; see resolveCaller. */
  caller: string | null;
  /** The definition id, which exists whether or not a template document does. */
  id: string;
  template: Template | null;
  countMintedVehicles: (id: string) => Promise<number>;
  manufacturerOwner: (slug: string) => Promise<ManufacturerLookup>;
  developerLicense: (address: string | null) => Promise<DeveloperLicenseLookup>;
  curators: string[];
}

/**
 * The make segment of a definition id. definitions-worker/src/template.ts
 * refuses any template whose manufacturer.slug differs from it, so on an
 * absent template the id is exactly as authoritative a source for the slug as
 * the stored document would have been.
 */
const makeSlug = (id: string): string => id.split('_')[0] ?? '';

/**
 * A DIMO developer license is what it takes to create or edit a template.
 *
 * It used to be the vehicle count: anything with a minted vehicle on it was
 * read-only to everybody but the Manufacturer NFT holder, waiting on a proposal
 * flow that is still not built. That left the registry uneditable in practice
 * -- a Camry with 80 cars on it is exactly the row somebody needs to fix -- and
 * DIMO_CURATOR_ADDRESSES is deliberately unset, so the curator tier that was
 * supposed to be the escape hatch is empty and even DIMO staff saw "read only".
 *
 * So the gate is now the license, the same credential every other write path in
 * this console takes, and the vehicle count is demoted to what it always
 * honestly was: a warning about blast radius, shown rather than enforced. The
 * worker still versions every write with a compare-and-swap, keeps history and
 * stamps an author, so an edit by the wrong person is visible and revertible --
 * which is the protection that actually exists, rather than a proposal queue
 * that does not.
 *
 * hardwareTemplateId stays DIMO-only at every tier below curator: it decides
 * what hardware ships, which is not a description of a car.
 */
export async function resolveEntitlement(args: EntitlementArgs): Promise<Entitlement> {
  const { caller, id, template, curators } = args;
  const isCurator = curators.some((c) => eq(c, caller));

  // Informational, and so no longer fatal. It used to decide the tier, which
  // is why a count that could not be read had to close everything down; now a
  // blip costs the editor a number on a banner and nothing else.
  let mintedVehicles: number | null = null;
  try {
    mintedVehicles = await args.countMintedVehicles(id);
  } catch {
    mintedVehicles = null;
  }

  const vehicles = (): string => {
    if (mintedVehicles === null) {
      return 'The vehicle count could not be read, so this template may describe cars that are already on the road.';
    }
    if (mintedVehicles === 0) return 'No vehicle resolves to it yet.';
    return (
      `${mintedVehicles.toLocaleString()} minted vehicle${mintedVehicles === 1 ? '' : 's'} ` +
      `resolve${mintedVehicles === 1 ? 's' : ''} to it, so publishing re-describes ` +
      `${mintedVehicles === 1 ? 'that car' : 'all of them'}.`
    );
  };

  if (isCurator) {
    return {
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
      mintedVehicles,
      reason: `You are a DIMO curator. ${vehicles()}`,
    };
  }

  // Fails closed, like every other identity question here: "we could not check
  // your license" is not "you have no license".
  let license: DeveloperLicenseLookup;
  try {
    license = await args.developerLicense(caller);
  } catch {
    return {
      kind: 'unavailable',
      canPublish: false,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason: 'Could not verify your DIMO developer license. Try again.',
    };
  }

  if (license.kind === 'held') {
    const named = license.alias
      ? `${license.tokenId} ("${license.alias}")`
      : `${license.tokenId}`;
    const held =
      license.via === 'owner'
        ? `You hold DIMO developer license ${named}`
        : `You are a signer on DIMO developer license ${named}`;
    if (template === null) {
      return {
        kind: 'create',
        canPublish: true,
        canSetHardwareTemplateId: false,
        mintedVehicles,
        reason: `${held}, and no template exists for this definition yet. ${vehicles()}`,
      };
    }
    return {
      kind: 'licensed',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason: `${held}, which is what publishing takes. ${vehicles()}`,
    };
  }

  // Kept below the license rather than removed. Holding the Manufacturer NFT for
  // the make is a stronger claim on the row than any developer license, and an
  // OEM that has never minted a license should not be locked out of its own
  // models.
  const slug = template?.manufacturer.slug ?? makeSlug(id);
  let held: ManufacturerLookup;
  try {
    held = await args.manufacturerOwner(slug);
  } catch {
    return {
      kind: 'unavailable',
      canPublish: false,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason:
        'Could not verify who holds the Manufacturer NFT for this template. Try again.',
    };
  }
  if (held.kind === 'found' && eq(held.owner, caller)) {
    return {
      kind: 'manufacturer',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason: `You hold the ${template?.manufacturer.name ?? slug} Manufacturer NFT (token ${held.tokenId}). ${vehicles()}`,
    };
  }

  return {
    kind: 'license-required',
    canPublish: false,
    canSetHardwareTemplateId: false,
    mintedVehicles,
    reason:
      'Creating or editing a template takes a DIMO developer license, and this ' +
      'account does not hold one or sign for one. Create a license under ' +
      'Developer licenses, then reload this page.',
  };
}
