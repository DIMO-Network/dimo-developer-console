import type { TeamLicense } from '@/hooks/useTeamLicenses';

export interface SignerToggle {
  tokenId: number;
  signer: `0x${string}`;
  enabled: boolean;
}

export interface RecordedToggle extends SignerToggle {
  at: number;
}

// How long a change this page made outranks Identity's list.
export const OVERLAY_MS = 60_000;

// Identity indexes SignerEnabled and SignerDisabled seconds after the chain, so
// right after a grant or revoke its lists still show the old state. Changes this
// page just made win, in order, until they are a minute old.
export const applySignerOverlay = (
  licenses: TeamLicense[],
  toggles: RecordedToggle[],
  now: number,
): TeamLicense[] => {
  const live = toggles.filter((t) => now - t.at < OVERLAY_MS);
  if (!live.length) return licenses;
  return licenses.map((license) => {
    const mine = live.filter((t) => t.tokenId === license.tokenId);
    if (!mine.length) return license;
    const signers = new Set(license.signers);
    for (const { signer, enabled } of mine) {
      if (enabled) signers.add(signer.toLowerCase());
      else signers.delete(signer.toLowerCase());
    }
    return { ...license, signers: [...signers] };
  });
};
