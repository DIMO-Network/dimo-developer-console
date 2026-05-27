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
      if (!currentUser?.smartContractAddress) {
        throw new Error('User session is invalid');
      }

      setIsLoading(true);
      try {
        const result = await processTransactions([
          {
            to: configuration.DIMO_SACD_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: SacdABI as Abi,
              functionName: 'setPermissions',
              args: [
                configuration.VEHICLE_NFT_ADDRESS,
                BigInt(tokenId),
                currentUser.smartContractAddress,
                BigInt(0),
                BigInt(0),
                '',
              ],
            }),
          },
        ]);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, processTransactions],
  );

  return { renounce, isLoading };
};
