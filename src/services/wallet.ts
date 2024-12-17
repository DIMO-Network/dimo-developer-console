'use server';

import { wagmiAbi } from '@/contracts/wagmi';
import { IPasskeyAttestation, ISubOrganization } from '@/types/wallet';
import { base64UrlEncode } from '@/utils/wallet';
import { TurnkeyClient } from '@turnkey/http';
import { TSignedRequest, TStamper } from '@turnkey/http/dist/base';
import { createAccount } from '@turnkey/viem';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { walletClientToSmartAccountSigner, ENTRYPOINT_ADDRESS_V07 } from 'permissionless';
import {
    Chain,
    createPublicClient,
    createWalletClient,
    decodeErrorResult,
    encodeFunctionData,
    getContract,
    http,
    HttpRequestError,
  } from 'viem';
import { polygon, polygonAmoy } from 'wagmi/chains';

const {
    VERCEL_ENV,
    TURNKEY_API_BASE_URL,
    BUNDLER_RPC,
    PAYMASTER_RPC,
    RPC_URL,
} = process.env;

export const generateRecoverySignedRequests = async ({
    stamper,
    user,
    attestation,
    challenge,
}:{
    stamper: TStamper;
    user: { organizationId: string; userId: string };
    attestation: IPasskeyAttestation;
    challenge: ArrayBuffer;
}): Promise<{
    signedRemoveAuthenticators: TSignedRequest;
    signedRecoverUser: TSignedRequest;
}> => {
    const client = new TurnkeyClient(
          {
            baseUrl: TURNKEY_API_BASE_URL!,
          },
          stamper,
        );
    
        const { authenticators } = await client.getAuthenticators({
          organizationId: user!.organizationId,
          userId: user!.userId,
        });
    
        const signedRemoveAuthenticators = await client.stampDeleteAuthenticators({
          type: 'ACTIVITY_TYPE_DELETE_AUTHENTICATORS',
          timestampMs: Date.now().toString(),
          organizationId: user!.organizationId,
          parameters: {
            userId: user!.userId,
            authenticatorIds: authenticators!.map((auth) => auth.authenticatorId),
          },
        });
    
        const signedRecoverUser = await client.stampRecoverUser({
          type: 'ACTIVITY_TYPE_RECOVER_USER',
          timestampMs: Date.now().toString(),
          organizationId: user!.organizationId,
          parameters: {
            userId: user!.userId,
            authenticator: {
              authenticatorName: 'DIMO PASSKEY',
              challenge: base64UrlEncode(challenge),
              attestation,
            },
          },
        });

        return {
            signedRemoveAuthenticators,
            signedRecoverUser,
        };
};

export const buildKernelClient = async ({stamper, organizationInfo}: {organizationInfo: ISubOrganization; stamper: TStamper;}) => {
    try {
        console.info(organizationInfo);
        const {
            subOrganizationId,
            walletAddress,
          } = organizationInfo;
          
      const chain = await determineChain();
      const stamperClient = new TurnkeyClient(
        {
          baseUrl: TURNKEY_API_BASE_URL!,
        },
        stamper,
      );

      const localAccount = await createAccount({
        client: stamperClient,
        organizationId: subOrganizationId,
        signWith: walletAddress,
        ethereumAddress: walletAddress,
      });

      const smartAccountClient = createWalletClient({
        account: localAccount,
        chain: chain,
        transport: http(RPC_URL!),
      });

      const smartAccountSigner =
        walletClientToSmartAccountSigner(smartAccountClient);

      const publicClient = await buildPublicClient();
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: smartAccountSigner,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        kernelVersion: KERNEL_V3_1,
      });

      const zeroDevKernelAccount = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        kernelVersion: KERNEL_V3_1,
      });

      return createKernelAccountClient({
        account: zeroDevKernelAccount,
        chain: chain,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        bundlerTransport: http(BUNDLER_RPC!),
        middleware: {
          sponsorUserOperation: sponsorUserOperation,
        },
      });
    } catch (e) {
      console.error('Error creating kernel client', e);
      return null;
    }
  };

 export const buildPublicClient = async () => {
    const chain = await determineChain();
    return createPublicClient({
      chain: chain,
      transport: http(RPC_URL!),
    });
  };

  const sponsorUserOperation = async ({
    userOperation,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userOperation: any;
  }) => {
    const chain = await determineChain();
    const zerodevPaymaster = createZeroDevPaymasterClient({
      chain: chain,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      transport: http(PAYMASTER_RPC!),
    });
    return zerodevPaymaster.sponsorUserOperation({
      userOperation,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
    });
  };

 export const extractOnChainErrorMessage = async (error: HttpRequestError): Promise<string> => {
    await Promise.resolve(true);
    console.error('Error on chain:', error);

    if (!error.details) {
      return 'Unknown error';
    }

    const errorData: `0x${string}` = error.details
      .replaceAll('"', '')
      .split(': ')[1] as `0x${string}`;

    const value = decodeErrorResult({
      abi: wagmiAbi,
      data: errorData,
    });

    console.error('Error value:', value);

    const { args } = value;

    return args[0];
  };

export const determineChain = async (): Promise<Chain> => {    
    await Promise.resolve(true);
    if (VERCEL_ENV === 'production') {
      return polygon;
    }
    return polygonAmoy;
  };
