import { useCallback } from 'react';
import { Abi, encodeFunctionData, keccak256, toBytes } from 'viem';
import { useContractGA, useGlobalAccount } from '@/hooks';
import configuration from '@/config';
import DimoRegistryABI from '@/contracts/DimoRegistryABI.json';
import { decodeHex } from '@/utils/formatHex';

// keccak256("VehicleNodeMinted(uint256,uint256,address)")
const VEHICLE_NODE_MINTED_TOPIC = keccak256(
  toBytes('VehicleNodeMinted(uint256,uint256,address)'),
);

export interface MintVehicleParams {
  manufacturerNodeId: number;
  deviceDefinitionId: string;
}

export const useMintVehicle = () => {
  const { processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();

  return useCallback(
    async ({ manufacturerNodeId, deviceDefinitionId }: MintVehicleParams) => {
      if (!currentUser?.smartContractAddress) throw new Error('User session is invalid');

      const result = await processTransactions(
        [
          {
            to: configuration.DIMO_REGISTRY_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: DimoRegistryABI as Abi,
              functionName: 'mintVehicleWithDeviceDefinition',
              args: [
                BigInt(manufacturerNodeId),
                currentUser.smartContractAddress,
                deviceDefinitionId,
                [],
              ],
            }),
          },
        ],
        { abi: DimoRegistryABI as Abi },
      );

      // Extract tokenId from VehicleNodeMinted event logs (topics[2] = tokenId, topics[1] = manufacturerNode)
      const mintedLog = result.logs?.find(
        ({ topics: [topic = '0x'] = [] }) => topic === VEHICLE_NODE_MINTED_TOPIC,
      );

      if (!mintedLog) {
        console.warn(
          '[useMintVehicle] VehicleNodeMinted event not found in transaction logs',
          {
            expectedTopic: VEHICLE_NODE_MINTED_TOPIC,
            logs: result.logs,
          },
        );
      }

      const { topics: [, , rawTokenId = '0x'] = [] } = mintedLog ?? {};

      const tokenId =
        rawTokenId !== '0x'
          ? Number(decodeHex(rawTokenId as `0x${string}`, 'uint256'))
          : null;

      return { ...result, tokenId };
    },
    [currentUser, processTransactions],
  );
};
