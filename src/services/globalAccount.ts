'use client';

import axios from 'axios';
import { IEmailAuth, ISubOrganization, IWaasOrganization, IWallet, IWalletSubOrganization } from '@/types/wallet';
import { polygon } from 'wagmi/chains';
import {
  ENTRYPOINT_ADDRESS_V07,
  walletClientToSmartAccountSigner,
  bundlerActions
} from 'permissionless';
import {SmartAccountSigner} from 'permissionless/accounts';
import {signerToEcdsaValidator} from '@zerodev/ecdsa-validator';
import {KERNEL_V3_1} from '@zerodev/sdk/constants';
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { createAccount } from '@turnkey/viem';
import { TStamper } from '@turnkey/http/dist/base';
import { TurnkeyClient } from "@turnkey/http";
import { turnkeyApiClient, turnkeyConfig } from '@/config/turnkey';
import { TurnkeyBrowserClient, TurnkeyIframeClient } from '@turnkey/sdk-browser';
import type { TurnkeyServerClient } from '@turnkey/sdk-server';

// configurations
const PROJECT_ID = 'c3526d90-4977-44e3-8584-8820693a7fd9';
export const BUNDLER_RPC = `https://rpc.zerodev.app/api/v2/bundler/${PROJECT_ID}`;
export const PAYMASTER_RPC = `https://rpc.zerodev.app/api/v2/paymaster/${PROJECT_ID}`;

const waasClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WAAS_API!
});

// public functions
export const userEmailAuth = async (emailAuth: IEmailAuth) => {
  const { data } = await waasClient.post(`/auth`,
     emailAuth,
    {
      headers: {
        'Content-Type': 'application/json',
      },
  });

  return data;
};

export const getUserSubOrganization = async (email: string) : Promise<ISubOrganization> => {
  const { data } = await waasClient.get(`/auth/${email}`);
  return data;
};

export const createSubOrganization = async (walletInfo: Partial<IWalletSubOrganization>) => {

  const path = walletInfo.encodedChallenge ? '/passkey' : '/email';

  const { data } = await waasClient.post(path, walletInfo, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return data;
};

export const createWallet = async (subOrganizationId: string, stamper: TStamper) :Promise<IWallet> => {
  const { address } = await getAccountWallet(subOrganizationId);
  const smartAccountSigner = await getSmartAccountSigner(subOrganizationId, address, stamper);
  const { kernelAddress, kernelClient } = await getZeroDevKernelAccountClient(smartAccountSigner);

/*
  const encodedTransaction = await kernelClient.account.encodeCallData({
    to: kernelAddress,
    value: BigInt(0),
    data: '0x',
  });

  const transaction = await kernelClient.sendUserOperation({
    userOperation: {
      callData: encodedTransaction,
    },
  });

  // TODO: check if this is relevant.
  const bundlerClient = kernelClient.extend(bundlerActions(ENTRYPOINT_ADDRESS_V07));

  const { success, reason } = await bundlerClient.waitForUserOperationReceipt({
    hash: transaction,
  });
*/
  return { address: kernelAddress, success: true, reason: undefined };
};

// private functions
const getAccountWallet = async (subOrganizationId: string) => {
  const {wallets} = await turnkeyApiClient.getWallets({
    organizationId: subOrganizationId,
  });

  const {accounts} = await turnkeyApiClient.getWalletAccounts({
    organizationId: subOrganizationId,
    walletId: wallets[0].walletId,
  });

  return accounts[0];
};

const getSmartAccountSigner = async (
  subOrganizationId: string,
  walletAddress: string,
  stamper: TStamper,
) => {
  const turnkeyClient = getTurnkeyClientWithStamper(stamper);
  const localAccount = await createAccount({
    client: turnkeyClient,
    organizationId: subOrganizationId,
    signWith: walletAddress,
    ethereumAddress: walletAddress,
  });

  const smartAccountClient = createWalletClient({
    account: localAccount,
    chain: polygon,
    transport: http(BUNDLER_RPC),
  });

  return walletClientToSmartAccountSigner(smartAccountClient);
};

const getZeroDevKernelAccountClient = async (
  smartAccountSigner: SmartAccountSigner<'custom', `0x${string}`>,
) => {
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(BUNDLER_RPC),
  });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: smartAccountSigner,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    kernelVersion: KERNEL_V3_1,
  });

  const kernelAccount =  await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    kernelVersion: KERNEL_V3_1,
  });

  const {address: kernelAddress} = kernelAccount;

  const kernelClient = createKernelAccountClient({
    account: kernelAccount,
    chain: polygon,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    bundlerTransport: http(BUNDLER_RPC),
    middleware: {
      sponsorUserOperation: sponsorUserOperation,
    },
  });

  return {
    kernelClient,
    kernelAddress
  };
};

const sponsorUserOperation = async ({userOperation}) => {
  const zerodevPaymaster = createZeroDevPaymasterClient({
    chain: polygon,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    transport: http(PAYMASTER_RPC),
  });
  return zerodevPaymaster.sponsorUserOperation({
    userOperation,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
  });
};

const getTurnkeyClientWithStamper = (stamper: TStamper) => {
  return new TurnkeyClient(
    {
      baseUrl: turnkeyConfig.apiBaseUrl,
    },
    stamper,
  );
};

const buildMagicLink = (email: string):string => {
  return `http://${window.location.host}/sign-up?flow=wallet-creation&continueWith=email&bundle=%s`;
};


