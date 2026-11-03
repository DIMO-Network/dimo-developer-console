import type { TeamLicense } from '@/hooks/useTeamLicenses';
import { OVERLAY_MS, applyToggles } from '@/utils/identityOverlay';

export interface SignerToggle {
  tokenId: number;
  signer: `0x${string}`;
  enabled: boolean;
}

export interface RecordedToggle extends SignerToggle {
  at: number;
}

export { OVERLAY_MS };

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
    const mine = live
      .filter((t) => t.tokenId === license.tokenId)
      .map((t) => ({ value: t.signer.toLowerCase(), enabled: t.enabled, at: t.at }));
    if (!mine.length) return license;
    return { ...license, signers: applyToggles(license.signers, mine, now) };
  });
};
