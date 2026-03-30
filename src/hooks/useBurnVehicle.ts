import { useCallback } from 'react';
import { Abi, encodeFunctionData } from 'viem';
import { useContractGA } from '@/hooks';
import configuration from '@/config';
import DimoVehicleIdABI from '@/contracts/DimoVehicleIdABI.json';

export const useBurnVehicle = () => {
  const { processTransactions } = useContractGA();

  return useCallback(
    async ({ tokenId }: { tokenId: number }) => {
      return processTransactions(
        [
          {
            to: configuration.VEHICLE_NFT_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: DimoVehicleIdABI as Abi,
              functionName: 'burn',
              args: [BigInt(tokenId)],
            }),
          },
        ],
        { abi: DimoVehicleIdABI as Abi },
      );
    },
    [processTransactions],
  );
};
