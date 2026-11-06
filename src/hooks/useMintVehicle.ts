import { ALL_VEHICLE_PERMISSIONS } from '@/utils/sacdPermissions';
import { useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Abi, Call, encodeFunctionData, keccak256, toBytes } from 'viem';
import { useContractGA } from './useContractGA';
import { useGlobalAccount } from './useGlobalAccount';
import { useSACD } from './useSACD';
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

// ~75 years — effectively permanent for a test vehicle
const SACD_EXPIRATION = BigInt(4102444800);

// A license can own an address that is already a grantee (case differs), and
// signing it twice would put two grants on the same vehicle for one account.
const uniqueAddresses = (addresses: `0x${string}`[]) => {
  const seen = new Set<string>();
  return addresses.filter((address) => {
    const key = address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface MintVehicleParams {
  manufacturerNodeId: number;
  deviceDefinitionId: string;
  make: string;
  model: string;
  year: number;
  powertrainType: string;
  sacdGrantees: `0x${string}`[];
}

export const useMintVehicle = () => {
  const { processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();
  const { signAndUploadPermissionSACD } = useSACD();

  return useCallback(
    async ({
      manufacturerNodeId,
      deviceDefinitionId,
      make,
      model,
      year,
      sacdGrantees,
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

      // The vehicle is minted by now, so a failed grant must not lose it.
      let sacdFailed = false;
      if (tokenId !== null) {
        try {
          const chainId = Number(configuration.CONTRACT_NETWORK);
          const asset = `did:erc721:${chainId}:${configuration.VEHICLE_NFT_ADDRESS}:${tokenId}`;

          // One signed agreement per grantee, then every grant in a single
          // operation so the vehicle is shared with all of them or none.
          const calls: Call[] = [];
          for (const grantee of uniqueAddresses(sacdGrantees)) {
            console.log('[useMintVehicle] Generating and uploading SACD agreement', {
              tokenId,
              grantee,
              asset,
            });
            const sacdSource = await signAndUploadPermissionSACD({
              grantee,
              grantor: currentUser.smartContractAddress,
              asset,
              expiration: SACD_EXPIRATION,
            });
            calls.push({
              to: configuration.DIMO_SACD_ADDRESS,
              value: BigInt(0),
              data: encodeFunctionData({
                abi: SacdABI as Abi,
                functionName: 'setPermissions',
                args: [
                  configuration.VEHICLE_NFT_ADDRESS,
                  BigInt(tokenId),
                  grantee,
                  ALL_VEHICLE_PERMISSIONS,
                  SACD_EXPIRATION,
                  sacdSource,
                ],
              }),
            });
          }

          if (calls.length > 0) {
            console.log('[useMintVehicle] Setting SACD permissions', {
              tokenId,
              grantees: sacdGrantees,
            });
            const grant = await processTransactions(calls, { abi: SacdABI as Abi });
            if (!grant.success) {
              throw new Error(grant.reason ?? 'SACD permissions transaction reverted');
            }
            console.log('[useMintVehicle] SACD permissions set', { tokenId });
          }
        } catch (e) {
          console.error('[useMintVehicle] SACD grant failed', { tokenId, error: e });
          Sentry.captureException(e);
          sacdFailed = true;
        }
      }

      return { ...result, tokenId, sacdFailed };
    },
    [currentUser, processTransactions, signAndUploadPermissionSACD],
  );
};
