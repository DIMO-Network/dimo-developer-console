import config from '@/config';
import type { Template } from '@/types/template';
import { getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';

export type EntitlementKind =
  | 'create'
  | 'author'
  | 'manufacturer'
  | 'curator'
  | 'proposal-required'
  /** identity-api could not answer something the decision needs, so nothing is decided. */
  | 'unavailable';

export interface Entitlement {
  kind: EntitlementKind;
  canPublish: boolean;
  /** DIMO only, at every tier. It decides what hardware ships. */
  canSetHardwareTemplateId: boolean;
  /** null when identity-api did not answer: an unknown count is not zero. */
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
 * The caller, from the session Console already has. Mirrors src/middleware.ts:
 * the session cookie identifies a user, and the Global Account sub-organisation
 * is what turns that user into an address. The smart contract address is used,
 * not the Turnkey EOA: it is the address DIMO records on chain, so it is the
 * one that can hold a Manufacturer NFT.
 */
export async function resolveCaller(): Promise<{
  address: `0x${string}`;
  email: string;
} | null> {
  try {
    const user = await getUserByToken();
    const email = user.company_email_owner ?? user.email;
    const sub = await getUserSubOrganization(email);
    if (!sub?.smartContractAddress) return null;
    return { address: sub.smartContractAddress, email };
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
  const resp = await fetch(config.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
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

export async function manufacturerOwner(
  slug: string,
): Promise<{ owner: string; tokenId: number } | null> {
  const data = await identity<{
    manufacturer: { owner: string; tokenId: number } | null;
  }>(
    `query TemplateManufacturer($slug: String!) {
       manufacturer(by: { slug: $slug }) { owner tokenId }
     }`,
    { slug },
  );
  return data.manufacturer ?? null;
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
  caller: string;
  /** The definition id, which exists whether or not a template document does. */
  id: string;
  template: Template | null;
  countMintedVehicles: (id: string) => Promise<number>;
  manufacturerOwner: (slug: string) => Promise<{ owner: string; tokenId: number } | null>;
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
 * The split falls where risk falls, and risk is the vehicle count -- never the
 * presence of a template document. Creating ineos_grenadier_2024 harms nobody.
 * Writing toyota_camry_2020 silently re-describes every vehicle pointing at it,
 * and that is just as true when no template has been imported for it yet: the
 * production extraction has never been run, so Console's own search renders
 * those rows as 'missing' while identity serves the definition to hundreds of
 * thousands of vehicles. The count is asked about the DEFINITION, so an absent
 * template goes through exactly the same tiers as a stored one.
 */
export async function resolveEntitlement(args: EntitlementArgs): Promise<Entitlement> {
  const { caller, id, template, curators } = args;
  const isCurator = curators.some((c) => eq(c, caller));

  // The count is what the rest of this function decides on. When it cannot
  // be read the answer is "not now", for everyone: a count that fell back to
  // zero would open an unauthored template to whoever was editing it during
  // the blip, and a decision made on a guess is not one anybody granted.
  let mintedVehicles: number;
  try {
    mintedVehicles = await args.countMintedVehicles(id);
  } catch {
    return {
      kind: 'unavailable',
      canPublish: false,
      canSetHardwareTemplateId: false,
      mintedVehicles: null,
      reason: 'Could not verify the vehicle count for this template. Try again.',
    };
  }

  if (isCurator) {
    return {
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
      mintedVehicles,
      reason: 'You are a DIMO curator.',
    };
  }

  if (mintedVehicles === 0) {
    if (template === null) {
      return {
        kind: 'create',
        canPublish: true,
        canSetHardwareTemplateId: false,
        mintedVehicles: 0,
        reason:
          'This template does not exist yet and no vehicle resolves to the definition, so creating it cannot re-describe anything.',
      };
    }
    // An absent author is a backfill-created template, which nobody has claimed.
    // Treating it as unowned is what keeps the open tier from being empty.
    if (!template.author || eq(template.author, caller)) {
      return {
        kind: 'author',
        canPublish: true,
        canSetHardwareTemplateId: false,
        mintedVehicles: 0,
        reason: 'No vehicle references this template yet.',
      };
    }
    return {
      kind: 'proposal-required',
      canPublish: false,
      canSetHardwareTemplateId: false,
      mintedVehicles: 0,
      reason: `This template was published by ${template.author}. Editing someone else's template opens a proposal, which is not built yet.`,
    };
  }

  // Same rule as the count. The holder lookup throws on the same identity
  // failures, and uncaught that turned the editor's GET into a 502 during an
  // outage. "Could not check" is also not "somebody else holds it": a
  // manufacturer told proposal-required would read it as a denial.
  const slug = template?.manufacturer.slug ?? makeSlug(id);
  let owner: Awaited<ReturnType<EntitlementArgs['manufacturerOwner']>>;
  try {
    owner = await args.manufacturerOwner(slug);
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
  if (owner && eq(owner.owner, caller)) {
    return {
      kind: 'manufacturer',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason: `You hold the ${template?.manufacturer.name ?? slug} Manufacturer NFT (token ${owner.tokenId}).`,
    };
  }

  const what = template === null ? 'definition' : 'template';
  return {
    kind: 'proposal-required',
    canPublish: false,
    canSetHardwareTemplateId: false,
    mintedVehicles,
    reason:
      `${mintedVehicles.toLocaleString()} minted vehicle${mintedVehicles === 1 ? '' : 's'} resolve to this ` +
      `${what}. Editing it needs a proposal a curator merges, which is not built yet.`,
  };
}
