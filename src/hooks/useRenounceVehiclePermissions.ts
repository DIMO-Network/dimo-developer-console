import { useCallback, useState } from 'react';
import { Abi, encodeFunctionData } from 'viem';
import { useContractGA } from '@/hooks/useContractGA';
import useGlobalAccount from '@/hooks/useGlobalAccount';
import configuration from '@/config';
import SacdABI from '@/contracts/Sacd.json';

export const useRenounceVehiclePermissions = () => {
  const { processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();
  const [isLoading, setIsLoading] = useState(false);

  const renounce = useCallback(
    async (tokenId: number) => {
      const smartContractAddress = currentUser?.smartContractAddress;

      if (!smartContractAddress) {
        throw new Error('No wallet connected — please sign in again');
      }

      setIsLoading(true);
      try {
        const result = await processTransactions([
          {
            to: configuration.DIMO_SACD_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: SacdABI as Abi,
              functionName: 'renouncePermissions',
              args: [configuration.VEHICLE_NFT_ADDRESS, BigInt(tokenId)],
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
