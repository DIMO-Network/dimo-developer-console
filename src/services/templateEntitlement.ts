import config from '@/config';
import type { Template } from '@/types/template';
import { getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';

export type EntitlementKind =
  | 'create'
  | 'author'
  | 'manufacturer'
  | 'curator'
  | 'proposal-required';

export interface Entitlement {
  kind: EntitlementKind;
  canPublish: boolean;
  /** DIMO only, at every tier. It decides what hardware ships. */
  canSetHardwareTemplateId: boolean;
  mintedVehicles: number;
  reason: string;
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

async function identity<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const resp = await fetch(config.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`identity-api returned ${resp.status}`);
  const json = (await resp.json()) as { data?: T };
  return json.data ?? null;
}

/** How many vehicles point at this template. This is the number that decides risk. */
export async function countMintedVehicles(id: string): Promise<number> {
  const data = await identity<{ vehicles: { totalCount: number } }>(
    `query TemplateVehicles($id: String!) {
       vehicles(filterBy: { deviceDefinitionId: $id }, first: 1) { totalCount }
     }`,
    { id },
  );
  return data?.vehicles.totalCount ?? 0;
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
  return data?.manufacturer ?? null;
}

export interface EntitlementArgs {
  caller: string;
  template: Template | null;
  countMintedVehicles: (id: string) => Promise<number>;
  manufacturerOwner: (slug: string) => Promise<{ owner: string; tokenId: number } | null>;
  curators: string[];
}

/**
 * The split falls where risk falls. Creating ineos_grenadier_2024 harms nobody.
 * Editing toyota_camry_2020 silently re-describes every vehicle pointing at it.
 */
export async function resolveEntitlement(args: EntitlementArgs): Promise<Entitlement> {
  const { caller, template, curators } = args;
  const isCurator = curators.some((c) => eq(c, caller));

  if (template === null) {
    return {
      kind: isCurator ? 'curator' : 'create',
      canPublish: true,
      canSetHardwareTemplateId: isCurator,
      mintedVehicles: 0,
      reason:
        'This template does not exist yet, so creating it cannot re-describe anything.',
    };
  }

  if (isCurator) {
    return {
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
      mintedVehicles: await args.countMintedVehicles(template.id),
      reason: 'You are a DIMO curator.',
    };
  }

  const mintedVehicles = await args.countMintedVehicles(template.id);

  if (mintedVehicles === 0) {
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

  const owner = await args.manufacturerOwner(template.manufacturer.slug);
  if (owner && eq(owner.owner, caller)) {
    return {
      kind: 'manufacturer',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason: `You hold the ${template.manufacturer.name} Manufacturer NFT (token ${owner.tokenId}).`,
    };
  }

  return {
    kind: 'proposal-required',
    canPublish: false,
    canSetHardwareTemplateId: false,
    mintedVehicles,
    reason:
      `${mintedVehicles.toLocaleString()} minted vehicle${mintedVehicles === 1 ? '' : 's'} resolve to this ` +
      'template. Editing it needs a proposal a curator merges, which is not built yet.',
  };
}
