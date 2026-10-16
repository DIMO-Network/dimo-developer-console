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

// 1. Disable every key in one user operation: each one the license lists and
//    each registered one. The lists come from Identity's index, which trails
//    the chain, so a key it no longer lists may still be enabled; disableSigner
//    is idempotent, so sending it for a key already off costs nothing.
// 2. Once that succeeded, stamp every registered key disabled. After a failed
//    transaction nothing is stamped, so the registry never calls a key disabled
//    while the chain may still honour it.
// Keys on a license outside the loaded list are left alone (the caller only
// offers Revoke once the licenses loaded cleanly). stampOnly finishes a revoke
// whose transaction already succeeded.
export const revokeMemberKeys = async (
  allKeys: MemberLicenseKey[],
  deps: RevokeDeps,
  { stampOnly = false }: { stampOnly?: boolean } = {},
): Promise<RevokeOutcome> => {
  const keys = allKeys.filter((k) => k.licenseKnown && (k.onChain || k.registered));
  let txError: unknown = null;
  if (keys.length && !stampOnly) {
    try {
      await deps.disable(keys.map(({ tokenId, signer }) => ({ tokenId, signer })));
    } catch (error) {
      txError = error;
    }
  }
  const unstamped: MemberLicenseKey[] = [];
  if (txError) return { txError, unstamped };
  for (const key of keys.filter((k) => k.registered)) {
    const result = await registryWrite(() => deps.stamp(key.tokenId, key.signer));
    if (!result.ok && result.code !== 'NOT_FOUND') unstamped.push(key);
  }
  return { txError, unstamped };
};
