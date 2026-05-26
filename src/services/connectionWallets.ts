import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface ConnectionWallets {
  connectionLicense: {
    publicKey: `0x${string}`;
    privateKey: `0x${string}`;
  };
  deviceIssuance: {
    publicKey: `0x${string}`;
    privateKey: `0x${string}`;
  };
}

export const generateConnectionWallets = async (): Promise<ConnectionWallets> => {
  const connectionLicensePrivateKey = generatePrivateKey();
  const connectionLicenseSigner = privateKeyToAccount(connectionLicensePrivateKey);

  const deviceIssuancePrivateKey = generatePrivateKey();
  const deviceIssuanceSigner = privateKeyToAccount(deviceIssuancePrivateKey);

  return {
    connectionLicense: {
      publicKey: connectionLicenseSigner.address,
      privateKey: connectionLicensePrivateKey,
    },
    deviceIssuance: {
      publicKey: deviceIssuanceSigner.address,
      privateKey: deviceIssuancePrivateKey,
    },
  };
};
