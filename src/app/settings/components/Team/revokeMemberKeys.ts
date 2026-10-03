import type { SignerChange } from '@/hooks/useSetLicenseSigners';
import type { ApiResult } from '@/types/team';
import { registryWrite } from '@/utils/registryWrite';
import type { MemberLicenseKey } from './memberKeys';

export interface RevokeDeps {
  disable: (changes: SignerChange[]) => Promise<void>;
  stamp: (tokenId: number, signer: `0x${string}`) => Promise<ApiResult<unknown>>;
}

export interface RevokeOutcome {
  txError: unknown | null;
  unstamped: MemberLicenseKey[];
}

// 1. Disable every key the chain still lists, in one user operation.
// 2. Stamp every registered key disabled, including ones already off-chain (an
//    old wallet, or an earlier revoke whose stamp failed).
// After a failed transaction only keys already off-chain are stamped, so the
// registry never calls a key disabled while the chain still honours it. "Off-
// chain" is only known for a license in the loaded list: other keys are left
// alone (the caller only offers Revoke once the licenses loaded cleanly).
export const revokeMemberKeys = async (
  allKeys: MemberLicenseKey[],
  deps: RevokeDeps,
): Promise<RevokeOutcome> => {
  const keys = allKeys.filter((k) => k.licenseKnown);
  const onChain = keys.filter((k) => k.onChain);
  let txError: unknown = null;
  if (onChain.length) {
    try {
      await deps.disable(onChain.map(({ tokenId, signer }) => ({ tokenId, signer })));
    } catch (error) {
      txError = error;
    }
  }
  const unstamped: MemberLicenseKey[] = [];
  for (const key of keys.filter((k) => k.registered && (!txError || !k.onChain))) {
    const result = await registryWrite(() => deps.stamp(key.tokenId, key.signer));
    if (!result.ok && result.code !== 'NOT_FOUND') unstamped.push(key);
  }
  return { txError, unstamped };
};
