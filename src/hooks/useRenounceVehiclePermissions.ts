import { useCallback, useState } from 'react';
import { Abi, encodeFunctionData } from 'viem';
import { useContractGA } from '@/hooks/useContractGA';
import useGlobalAccount from '@/hooks/useGlobalAccount';
import configuration from '@/config';
import SacdABI from '@/contracts/Sacd.json';

const LICENSE_BEACON_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const useRenounceVehiclePermissions = () => {
  const { processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();
  const [isLoading, setIsLoading] = useState(false);

  const renounce = useCallback(
    async (tokenId: number, clientId: string) => {
      if (!currentUser?.smartContractAddress) {
        throw new Error('No wallet connected — please sign in again');
      }

      setIsLoading(true);
      try {
        const renounceCalldata = encodeFunctionData({
          abi: SacdABI as Abi,
          functionName: 'renouncePermissions',
          args: [configuration.VEHICLE_NFT_ADDRESS, BigInt(tokenId)],
        });

        const result = await processTransactions([
          {
            to: clientId as `0x${string}`,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: LICENSE_BEACON_ABI as Abi,
              functionName: 'execute',
              args: [configuration.DIMO_SACD_ADDRESS, BigInt(0), renounceCalldata],
            }),
          },
        ]);

        if (!result.success) {
          throw new Error(result.reason ?? 'Transaction failed');
        }
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, processTransactions],
  );

  return { renounce, isLoading };
};
