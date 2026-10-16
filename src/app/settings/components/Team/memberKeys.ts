import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

export interface MemberLicenseKey {
  tokenId: number;
  licenseLabel: string;
  signer: `0x${string}`;
  // The license lists the signer on-chain right now.
  onChain: boolean;
  // console-api holds an enabled MEMBER registry row for it (memberKeys).
  registered: boolean;
  // The license is in the loaded list. Only then does onChain: false mean the
  // chain no longer lists the key; never stamp or revoke an unknown one.
  licenseKnown: boolean;
}

// Every key a member holds or held on this team's licenses: their registry
// MEMBER keys under any wallet they ever used (C7 memberKeys), plus their
// current wallet wherever the chain lists it.
export const memberLicenseKeys = (
  member: TeamMember,
  licenses: TeamLicense[],
): MemberLicenseKey[] => {
  const byToken = new Map(licenses.map((l) => [l.tokenId, l]));
  const keys = new Map<string, MemberLicenseKey>();
  const add = (tokenId: number, signer: `0x${string}`, registered: boolean) => {
    const id = `${tokenId}:${signer.toLowerCase()}`;
    const existing = keys.get(id);
    if (existing) {
      existing.registered = existing.registered || registered;
      return;
    }
    const license = byToken.get(tokenId);
    keys.set(id, {
      tokenId,
      licenseLabel: license?.label ?? `License #${tokenId}`,
      signer,
      onChain: !!license?.signers.includes(signer.toLowerCase()),
      registered,
      licenseKnown: !!license,
    });
  };
  member.memberKeys.forEach((k) => add(k.licenseTokenId, k.signerAddress, true));
  const current = member.signerAddress;
  if (current) {
    licenses
      .filter((l) => l.signers.includes(current.toLowerCase()))
      .forEach((l) => add(l.tokenId, current, false));
  }
  return [...keys.values()];
};

export const memberAddresses = (member: TeamMember): string[] => [
  ...new Set(
    [member.signerAddress, ...member.memberKeys.map((k) => k.signerAddress)]
      .filter((a): a is `0x${string}` => !!a)
      .map((a) => a.toLowerCase()),
  ),
];

// Keys Revoke or Remove can act on: on-chain, or recorded on a license that
// loaded (a stamp alone finishes an earlier revoke).
export const actionableKeys = (keys: MemberLicenseKey[]) =>
  keys.filter((k) => k.licenseKnown && (k.onChain || k.registered));

export interface GrantCandidate {
  license: TeamLicense;
  // Identity lists the key on-chain already (its registry write failed).
  onChain: boolean;
}

// Licenses a member can be given data access to: ones with a redirect URI (dex
// needs a domain for their developer JWT) where their current wallet has no
// recorded key. A key enabled on-chain whose registry write failed is still a
// candidate, so granting again records it (and enables it again: Identity's
// list can trail the chain).
export const grantCandidates = (
  member: TeamMember,
  licenses: TeamLicense[],
): GrantCandidate[] => {
  const signer = member.signerAddress?.toLowerCase();
  if (
    member.status !== 'ACCEPTED' ||
    member.role !== 'MEMBER' ||
    !signer ||
    !member.userId
  )
    return [];
  const recorded = new Set(
    member.memberKeys
      .filter((k) => k.signerAddress.toLowerCase() === signer)
      .map((k) => k.licenseTokenId),
  );
  return licenses
    .filter((l) => l.redirectUri && !recorded.has(l.tokenId))
    .map((license) => ({ license, onChain: license.signers.includes(signer) }));
};
