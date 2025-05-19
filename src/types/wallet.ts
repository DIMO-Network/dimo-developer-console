export interface ICreateGlobalAccountRequest {
  email: string;
  encodedChallenge: string;
  attestation: IPasskeyAttestation;
  deployAccount: boolean;
}

export interface IPasskeyAttestation {
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
}

export interface IEmailAuth {
  email: string;
  targetPublicKey: string;
  magicLink: string;
}

export interface ISubOrganization {
  email: string;
  subOrganizationId: string;
  emailVerified: boolean;
  walletAddress: `0x${string}`;
  smartContractAddress: `0x${string}`;
  hasPasskey: boolean;
}

export interface IWallet {
  address: `0x${string}`;
  success: boolean;
  reason?: string;
}

export interface IDcxPurchaseTransaction {
  destinationAddress: `0x${string}`;
  usdAmount: number;
  dcxAmount: bigint;
  requiredDimoAmount: bigint;
  currency: string;
  transactionHash: string;
}

export interface IGlobalAccountSession {
  email: string;
  role: string;
  subOrganizationId: string;
  token: string;
  expiry: number;
}

export interface Log {
  topics?: `0x${string}`;
}

export interface IKernelOperationStatus {
  success: boolean;
  reason?: string;
  logs?: Log[];
}

export interface ICoinMarketTokenResponse {
  data: {
    DIMO: ICryptoQuote[];
    POL: ICryptoQuote[];
    WMATIC: ICryptoQuote[];
  };
}

export interface ICryptoQuote {
  quote: {
    USD: {
      price: number;
    };
  };
}

export interface ITokenBalance {
  dimo: boolean;
  dlcAllowance: boolean;
  dcx: boolean;
  dcxAllowance: boolean;
}

export interface IDesiredTokenAmount {
  licensePrice: number;
  dimoCost: number;
  dimo: bigint;
  dcx: bigint;
}
