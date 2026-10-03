// Copy shared with the other console-teams parts (contracts index C8). Change
// it there first.
export const formatList = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

export const grantWarning = (name: string, license: string) =>
  `Data access lets ${name} use every permission vehicles have granted ${license}, including commands, through the DIMO APIs — not only what the console shows. Their queries spend ${license}'s DCX credits.`;

export const askForAccess = (ownerEmail: string, license: string) =>
  `Ask ${ownerEmail} for data access to ${license}.`;

export const NO_LONGER_HAS_ACCESS = 'You no longer have access to this license.';

export const DATA_ACCESS_UNAVAILABLE =
  "Data access for team members isn't available yet.";

export const removedFromTeam = (teamName: string) =>
  `You're no longer a member of ${teamName}.`;

export const signerLocked = (ownerEmail: string) =>
  `Your access is tied to another wallet. Ask ${ownerEmail} to revoke it first.`;

export const leaveConfirm = (teamName: string, ownerEmail: string) =>
  `Leave ${teamName}? ${ownerEmail} will be asked to revoke your data access.`;

// 409 SIGNER_IN_USE on PUT /api/me/signer: the wallet is another user's signer
// or an API key (C8).
export const SIGNER_IN_USE_MESSAGE =
  "This wallet is already recorded as someone else's key, so it can't be used for data access. Contact DIMO support.";
