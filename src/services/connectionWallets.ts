// src/services/connectionWallets.ts - New file
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createKernelAccount } from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { getPublicClient } from './zerodev';

export interface ConnectionWallets {
  connectionLicense: {
    publicKey: `0x${string}`;
    privateKey: `0x${string}`;
    aaAddress: `0x${string}`;
  };
  deviceIssuance: {
    privateKey: `0x${string}`;
    aaAddress: `0x${string}`;
  };
}

export const generateConnectionWallets = async (): Promise<ConnectionWallets> => {
  const publicClient = getPublicClient();
  const entryPoint = getEntryPoint('0.7');

  // Generate Wallet #1: Connection License (show public + private key)
  const connectionLicensePrivateKey = generatePrivateKey();
  const connectionLicenseSigner = privateKeyToAccount(connectionLicensePrivateKey);

  const connectionLicenseValidator = await signerToEcdsaValidator(publicClient, {
    signer: connectionLicenseSigner,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const connectionLicenseKernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: connectionLicenseValidator,
    },
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  // Generate Wallet #2: Device Issuance (show private key only)
  const deviceIssuancePrivateKey = generatePrivateKey();
  const deviceIssuanceSigner = privateKeyToAccount(deviceIssuancePrivateKey);

  const deviceIssuanceValidator = await signerToEcdsaValidator(publicClient, {
    signer: deviceIssuanceSigner,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const deviceIssuanceKernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: deviceIssuanceValidator,
    },
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  return {
    connectionLicense: {
      publicKey: connectionLicenseSigner.address,
      privateKey: connectionLicensePrivateKey,
      aaAddress: connectionLicenseKernelAccount.address,
    },
    deviceIssuance: {
      privateKey: deviceIssuancePrivateKey,
      aaAddress: deviceIssuanceKernelAccount.address,
    },
  };
};
