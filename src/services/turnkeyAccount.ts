'use client';
import { createAccount } from '@turnkey/viem';
import type { LocalAccount } from 'viem';
import { getSessionTurnkeyClient } from '@/services/turnkey';

// The user's Turnkey wallet as a plain EOA. License signers must be EOAs: the
// license account checks challenges with ECDSA.recover, so the kernel smart
// account cannot sign for a license. Import this lazily (await import): it
// pulls src/config/turnkey.ts, which needs the Turnkey env at module load.
export const getSessionEoaAccount = async (session: {
  subOrganizationId: string;
  walletAddress: `0x${string}`;
}): Promise<LocalAccount> => {
  const client = getSessionTurnkeyClient();
  if (!client) throw new Error('Turnkey session unavailable — sign in again');
  return (await createAccount({
    client,
    organizationId: session.subOrganizationId,
    signWith: session.walletAddress,
    ethereumAddress: session.walletAddress,
  })) as LocalAccount;
};
