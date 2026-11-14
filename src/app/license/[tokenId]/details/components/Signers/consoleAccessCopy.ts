import type { LicenseSignerRecord } from '@/types/team';

// The registry note on the console key's row: how a team member learns that
// console access is on (members can't look up the owner's Turnkey key).
export const CONSOLE_KEY_NOTE = 'Console';

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
