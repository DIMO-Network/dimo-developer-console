import { turnkeyConfig } from '@/config/turnkey';
import { ISubOrganization } from '@/types/wallet';
import { TurnkeyClient } from '@turnkey/http';
import { TurnkeyBrowserClient } from '@turnkey/sdk-browser';
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
import { getTurnkeyClient } from './turnkey';
import { polygon, polygonAmoy } from 'wagmi/chains';
import configuration from '@/config';

export const getKernelClient = async ({
  organizationInfo,
  authKey,
}: {
  organizationInfo: ISubOrganization;
  authKey: string;
}) => {
  const kernelClient = await buildFallbackKernelClients({
    organizationInfo,
    authKey,
  });
  return kernelClient;
};

const getChain = (): Chain => {
  if (configuration.environment === 'production') {
    return polygon;
  }
  return polygonAmoy;
};

const getPublicClient = () => {
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
    transport: http(`${turnkeyConfig.paymasterRpc}?provider=${provider}`),
  });
  return zerodevPaymaster.sponsorUserOperation({
    userOperation,
  });
};

const buildKernelClient = async ({
  orgInfo,
  provider,
  client,
}: {
  orgInfo: ISubOrganization;
  provider: string;
  client: TurnkeyBrowserClient | TurnkeyClient;
}) => {
  const { subOrganizationId, walletAddress } = orgInfo;
  const chain = getChain();
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

  const kernelClient = createKernelAccountClient({
    account: zeroDevKernelAccount,
    chain: chain,
    bundlerTransport: http(`${turnkeyConfig.bundleRpc}?provider=${provider}`),
    client: publicClient,
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

  return kernelClient;
};

const buildFallbackKernelClients = async ({
  organizationInfo,
  authKey,
}: {
  organizationInfo: ISubOrganization;
  authKey: string;
}) => {
  const fallbackProviders: string[] = ['ALCHEMY', 'GELATO', 'PIMLICO'];
  const fallbackKernelClients: KernelAccountClient<
    Transport,
    Chain,
    SmartAccount,
    Client,
    RpcSchema
  >[] = [];

  const client = getTurnkeyClient(authKey);

  for (const provider of fallbackProviders) {
    const kernelClient = await buildKernelClient({
      orgInfo: organizationInfo!,
      provider,
      client: client,
    });
    fallbackKernelClients.push(kernelClient);
  }

  return createFallbackKernelAccountClient(fallbackKernelClients);
};
