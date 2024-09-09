export interface IWalletSubOrganization {
  email: string;
  encodedChallenge?: string;
  attestation?: {
    credentialId: string;
    clientDataJson: string;
    attestationObject: string;
    transports: (
      | 'AUTHENTICATOR_TRANSPORT_BLE'
      | 'AUTHENTICATOR_TRANSPORT_INTERNAL'
      | 'AUTHENTICATOR_TRANSPORT_NFC'
      | 'AUTHENTICATOR_TRANSPORT_USB'
      | 'AUTHENTICATOR_TRANSPORT_HYBRID'
      )[];
  };
}

export interface IEmailAuth {
  email: string;
  targetPublicKey: string;
  magicLink: string;
}

export interface ISubOrganization {
  subOrganizationId: string;
  hasPasskey: boolean;
}

export interface IWallet {
  address: `0x${string}`;
  success: boolean;
  reason?: string;
}