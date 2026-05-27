import { useCallback, useState } from 'react';
import { Abi, encodeFunctionData } from 'viem';
import { useContractGA } from '@/hooks/useContractGA';
import configuration from '@/config';
import SacdABI from '@/contracts/Sacd.json';

export const useRenounceVehiclePermissions = () => {
  const { processTransactions } = useContractGA();
  const [isLoading, setIsLoading] = useState(false);

  const renounce = useCallback(
    async (tokenId: number) => {
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
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [processTransactions],
  );

  return { renounce, isLoading };
};
