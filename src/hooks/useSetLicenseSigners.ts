'use client';
import { useCallback } from 'react';
import { encodeFunctionData } from 'viem';
import configuration from '@/config';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import { useContractGA } from '@/hooks/useContractGA';
import { assertUserOperation } from '@/utils/userOperation';

export interface SignerChange {
  tokenId: number;
  signer: `0x${string}`;
}

// Every (license, signer) pair in one user operation: a grant or revoke across
// licenses is one signature and lands together or not at all.
export const useSetLicenseSigners = () => {
  const { processTransactions } = useContractGA();
  return useCallback(
    async (fn: 'enableSigner' | 'disableSigner', changes: SignerChange[]) => {
      if (!changes.length) return;
      const result = await processTransactions(
        changes.map(({ tokenId, signer }) => ({
          to: configuration.DLC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoLicenseABI,
            functionName: fn,
            args: [tokenId, signer],
          }),
        })),
      );
      // A reverted operation resolves with success: false; never treat it as done.
      assertUserOperation(result);
    },
    [processTransactions],
  );
};
