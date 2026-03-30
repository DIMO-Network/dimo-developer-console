import { useCallback } from 'react';
import { Abi, encodeFunctionData, keccak256, toBytes } from 'viem';
import { useContractGA, useGlobalAccount } from '@/hooks';
import configuration from '@/config';
import DimoRegistryABI from '@/contracts/DimoRegistryABI.json';
import SacdABI from '@/contracts/Sacd.json';
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

// All 8 DIMO permissions (bits 1–8): non-location telemetry, commands,
// current location, all-time location, credentials, streams, raw data, approximate location
const ALL_PERMISSIONS = BigInt(510);

// ~75 years — effectively permanent for a test vehicle
const SACD_EXPIRATION = BigInt(4102444800);

export interface MintVehicleParams {
  manufacturerNodeId: number;
  deviceDefinitionId: string;
  make: string;
  model: string;
  year: number;
  sacdGrantee?: `0x${string}`;
}

export const useMintVehicle = () => {
  const { processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();

  return useCallback(
    async ({
      manufacturerNodeId,
      deviceDefinitionId,
      make,
      model,
      year,
      sacdGrantee,
    }: MintVehicleParams) => {
      if (!currentUser?.smartContractAddress) throw new Error('User session is invalid');

      const attrInfo = [
        { attribute: 'Make', info: make },
        { attribute: 'Model', info: model },
        { attribute: 'Year', info: String(year) },
      ];

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
                attrInfo,
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

      if (tokenId !== null && sacdGrantee) {
        console.log('[useMintVehicle] Setting SACD permissions', {
          tokenId,
          grantee: sacdGrantee,
        });
        await processTransactions(
          [
            {
              to: configuration.DIMO_SACD_ADDRESS,
              value: BigInt(0),
              data: encodeFunctionData({
                abi: SacdABI as Abi,
                functionName: 'setPermissions',
                args: [
                  configuration.VEHICLE_NFT_ADDRESS,
                  BigInt(tokenId),
                  sacdGrantee,
                  ALL_PERMISSIONS,
                  SACD_EXPIRATION,
                  '',
                ],
              }),
            },
          ],
          { abi: SacdABI as Abi },
        );
        console.log('[useMintVehicle] SACD permissions set', {
          tokenId,
          grantee: sacdGrantee,
        });
      }

      return { ...result, tokenId };
    },
    [currentUser, processTransactions],
  );
};
