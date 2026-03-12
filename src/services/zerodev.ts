import { turnkeyConfig } from '@/config/turnkey';
import { TurnkeyClient } from '@turnkey/http';
import { createAccount } from '@turnkey/viem';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import {
  createKernelAccount,
  createKernelAccountClient,
  getUserOperationGasPrice,
  KernelAccountClient,
  createFallbackKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { Client, createPublicClient, RpcSchema } from 'viem';
import {
  GetPaymasterDataParameters,
  SmartAccount,
} from 'viem/_types/account-abstraction';
import { http, Transport } from 'wagmi';
import { Chain } from 'wagmi/chains';
import { polygon, polygonAmoy } from 'wagmi/chains';
import configuration from '@/config';

const getChain = (): Chain => {
  if (configuration.environment === 'production') {
    return polygon;
  }
  return polygonAmoy;
};

export const getPublicClient = () => {
  const chain = getChain();
  return createPublicClient({
    chain: chain,
    transport: http(turnkeyConfig.rpcUrl),
  });
};

const sponsorUserOperation = async ({
  userOperation,
  provider,
}: {
  userOperation: GetPaymasterDataParameters;
  provider: string;
}) => {
  const chain = getChain();
  const zerodevPaymaster = createZeroDevPaymasterClient({
    chain: chain,
    transport: http(`${turnkeyConfig.bundlerRpc}/chain/${chain.id}?provider=${provider}`),
  });
  return zerodevPaymaster.sponsorUserOperation({
    userOperation,
  });
};

const buildFallbackKernelClients = async ({
  subOrganizationId,
  walletAddress,
  client,
}: {
  subOrganizationId: string;
  walletAddress: `0x${string}`;
  client: TurnkeyClient;
}) => {
  const fallbackProviders: string[] = ['ALCHEMY', 'GELATO', 'PIMLICO'];
  const fallbackKernelClients: KernelAccountClient<
    Transport,
    Chain,
    SmartAccount,
    Client,
    RpcSchema
  >[] = [];

  const chain = getChain();
  const kernelAccount = await getKernelAccount({
    subOrganizationId,
    walletAddress,
    client,
  });

  for (const provider of fallbackProviders) {
    const kernelClient = createKernelAccountClient({
      account: kernelAccount,
      chain: chain,
      bundlerTransport: http(
        `${turnkeyConfig.bundlerRpc}/chain/${chain.id}?provider=${provider}`,
      ),
      client: kernelAccount.client,
      paymaster: {
        getPaymasterData: (userOperation) => {
          return sponsorUserOperation({
            userOperation,
            provider,
          });
        },
      },
      userOperation: {
        estimateFeesPerGas: async ({ bundlerClient }) => {
          return getUserOperationGasPrice(bundlerClient);
        },
      },
    });

    fallbackKernelClients.push(kernelClient);
  }

  return createFallbackKernelAccountClient(fallbackKernelClients);
};

export const getKernelAccount = async ({
  subOrganizationId,
  walletAddress,
  client,
}: {
  subOrganizationId: string;
  walletAddress: `0x${string}`;
  client: TurnkeyClient;
}) => {
  const entryPoint = getEntryPoint('0.7');
  const publicClient = getPublicClient();

  const localAccount = await createAccount({
    client: client,
    organizationId: subOrganizationId,
    signWith: walletAddress,
    ethereumAddress: walletAddress,
  });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: localAccount,
    entryPoint: entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const zeroDevKernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint: entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  return zeroDevKernelAccount;
};

export const getKernelClient = async ({
  subOrganizationId,
  walletAddress,
  client,
}: {
  subOrganizationId: string;
  walletAddress: `0x${string}`;
  client: TurnkeyClient;
}) => {
  const kernelClient = await buildFallbackKernelClients({
    subOrganizationId,
    walletAddress,
    client,
  });
  return kernelClient;
};
