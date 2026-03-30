import { useCallback } from 'react';
import { Abi, encodeFunctionData, keccak256, toBytes } from 'viem';
import { useContractGA, useGlobalAccount } from '@/hooks';
import configuration from '@/config';
import DimoRegistryABI from '@/contracts/DimoRegistryABI.json';
import { decodeHex } from '@/utils/formatHex';

// keccak256("VehicleNodeMintedWithDeviceDefinition(uint256,uint256,address,string)")
// This is the actual event emitted by mintVehicleWithDeviceDefinition on the DimoRegistry
const VEHICLE_NODE_MINTED_TOPIC = keccak256(
  toBytes('VehicleNodeMintedWithDeviceDefinition(uint256,uint256,address,string)'),
);

// keccak256("Transfer(address,address,uint256)") — ERC-721 standard
const ERC721_TRANSFER_TOPIC = keccak256(toBytes('Transfer(address,address,uint256)'));

const ZERO_ADDRESS_PADDED =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

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

      // Extract tokenId from VehicleNodeMinted event (topics[2] = tokenId, topics[1] = manufacturerNode)
      const mintedLog = result.logs?.find(
        ({ topics: [topic = '0x'] = [] }) => topic === VEHICLE_NODE_MINTED_TOPIC,
      );

      // Fallback: ERC-721 Transfer from zero address (topics[1] = from, topics[3] = tokenId)
      const transferMintLog = !mintedLog
        ? result.logs?.find(
            ({ topics: [topic = '0x', from = '0x'] = [] }) =>
              topic === ERC721_TRANSFER_TOPIC && from === ZERO_ADDRESS_PADDED,
          )
        : undefined;

      if (!mintedLog && !transferMintLog) {
        console.warn(
          '[useMintVehicle] VehicleNodeMinted event not found in transaction logs',
          {
            expectedTopic: VEHICLE_NODE_MINTED_TOPIC,
            logs: result.logs,
          },
        );
      }

      // VehicleNodeMinted: topics[2] = tokenId; ERC-721 Transfer mint: topics[3] = tokenId
      const rawTokenId = mintedLog
        ? (mintedLog.topics?.[2] ?? '0x')
        : (transferMintLog?.topics?.[3] ?? '0x');

      const tokenId =
        rawTokenId !== '0x'
          ? Number(decodeHex(rawTokenId as `0x${string}`, 'uint256'))
          : null;

      return { ...result, tokenId };
    },
    [currentUser, processTransactions],
  );
};
