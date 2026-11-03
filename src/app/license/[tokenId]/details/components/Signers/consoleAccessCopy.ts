import type { LicenseSignerRecord } from '@/types/team';

// The registry note on the console key's row: how a team member learns that
// console access is on (members can't look up the owner's Turnkey key).
export const CONSOLE_KEY_NOTE = 'Console';

export const CONSOLE_ACCESS_EXPLAINER =
  'Console access lets this console make developer JWTs for this license, so you can test without creating an API key. Turning it on adds your console key as a signer, in one transaction.';
export const ENABLE_CONSOLE_ACCESS = 'Enable console access';
export const ENABLING_CONSOLE_ACCESS = 'Turning on console access…';
export const MEMBER_CONSOLE_OFF =
  "The license owner hasn't turned on console access yet.";
export const NOT_LICENSE_OWNER_ON_CHAIN =
  "Your console wallet doesn't own this license on-chain, so it can't turn on console access.";
export const CONSOLE_KEY_LABEL = 'Console (you)';
export const TURN_OFF_CONSOLE_ACCESS = 'Turn off console access';
export const COPY_JWT = 'Copy JWT';
export const NO_REDIRECT_URI_FOR_JWT = 'Add a redirect URI below to make developer JWTs.';
export const JWT_FAILED = "Couldn't make a JWT. Try again.";
export const API_KEY_BUTTON = 'Create an API key for your server';
export const API_KEY_EXPLAINER =
  'For apps that mint developer JWTs on their own servers. To test from the console, use Copy JWT.';

// For the owner (consoleKey set) the key is an on-chain signer; for a member
// (consoleKey null) some on-chain signer carries the Console registry row.
export const isConsoleAccessOn = ({
  consoleKey,
  signers,
  registry,
}: {
  consoleKey: string | null;
  signers: string[];
  registry: Map<string, LicenseSignerRecord>;
}): boolean => {
  const onChain = signers.map((s) => s.toLowerCase());
  if (consoleKey) return onChain.includes(consoleKey.toLowerCase());
  return onChain.some((address) => {
    const record = registry.get(address);
    return record?.note === CONSOLE_KEY_NOTE && !record.disabledAt;
  });
};
