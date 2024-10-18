'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTurnkey } from '@turnkey/sdk-react';
import { useSession } from 'next-auth/react';
import { IPasskeyAttestation, ISubOrganization } from '@/types/wallet';
import { useRouter } from 'next/navigation';
import { getWebAuthnAttestation, TurnkeyClient } from '@turnkey/http';
import { isEmpty } from 'lodash';
import { signOut } from 'next-auth/react';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import {
  walletClientToSmartAccountSigner,
  ENTRYPOINT_ADDRESS_V07,
} from 'permissionless';
import { http } from 'wagmi';
import { type Chain, polygon, polygonAmoy } from 'wagmi/chains';
import { createAccount } from '@turnkey/viem';
import {
  createWalletClient,
  createPublicClient,
  type PublicClient,
} from 'viem';

import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import { turnkeyConfig } from '@/config/turnkey';

import configuration from '@/config';

const BUNDLE_RPC = process.env.NEXT_PUBLIC_BUNDLER_RPC!;

const generateRandomBuffer = (): ArrayBuffer => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer;
};

const base64UrlEncode = (challenge: ArrayBuffer): string => {
  return Buffer.from(challenge)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const useGlobalAccount = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { passkeyClient, authIframeClient } = useTurnkey();
  const [organizationInfo, setOrganizationInfo] =
    useState<ISubOrganization | null>(null);

  const currentChain = useMemo(() => {
    const isAmoy = configuration.CONTRACT_NETWORK === BigInt(80_002);
    return isAmoy ? 'Polygon Amoy' : 'Polygon';
  }, []);

  const validCredentials = useCallback(
    async (authToken: string) => {
      if (!authIframeClient) return null;
      return await authIframeClient.injectCredentialBundle(authToken);
    },
    [authIframeClient],
  );

  const getPasskeyAttestation = async (
    email: string,
    challenge: ArrayBuffer,
  ): Promise<IPasskeyAttestation> => {
    const authenticatorUserId = generateRandomBuffer();

    const attestation = await getWebAuthnAttestation({
      publicKey: {
        rp: {
          id: passkeyClient?.rpId,
          name: 'DIMO Global Accounts',
        },
        challenge,
        pubKeyCredParams: [
          {
            alg: -7,
            type: 'public-key',
          },
          {
            alg: -257,
            type: 'public-key',
          },
        ],
        user: {
          id: authenticatorUserId,
          name: `${email} @ DIMO`,
          displayName: `${email} @ DIMO`,
        },
        timeout: 300000,
        authenticatorSelection: {
          requireResidentKey: false,
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      },
    });

    return attestation;
  };

  const registerNewPasskey = async (): Promise<void> => {
    const me = await authIframeClient?.getWhoami();
    const challenge = generateRandomBuffer();
    const attestation = await getPasskeyAttestation(me!.username!, challenge);

    const client = new TurnkeyClient(
      {
        baseUrl: turnkeyConfig.apiBaseUrl,
      },
      authIframeClient!.config.stamper!,
    );

    const { authenticators } = await client.getAuthenticators({
      organizationId: me!.organizationId,
      userId: me!.userId,
    });

    const signedRemoveAuthenticators = await client.stampDeleteAuthenticators({
      type: 'ACTIVITY_TYPE_DELETE_AUTHENTICATORS',
      timestampMs: Date.now().toString(),
      organizationId: me!.organizationId,
      parameters: {
        userId: me!.userId,
        authenticatorIds: authenticators!.map((auth) => auth.authenticatorId),
      },
    });

    const signedRecoverUser = await client.stampRecoverUser({
      type: 'ACTIVITY_TYPE_RECOVER_USER',
      timestampMs: Date.now().toString(),
      organizationId: me!.organizationId,
      parameters: {
        userId: me!.userId,
        authenticator: {
          authenticatorName: 'DIMO PASSKEY',
          challenge: base64UrlEncode(challenge),
          attestation,
        },
      },
    });

    await rewirePasskey({
      signedRecoveryRequest: signedRecoverUser,
      signedAuthenticatorRemoval: signedRemoveAuthenticators,
    });
  };

  const walletLogin = async (): Promise<void> => {
    try {
      const { subOrganizationId } = organizationInfo!;
      // a bit hacky but works for now
      const signInResponse = await passkeyClient?.createReadOnlySession({
        organizationId: subOrganizationId,
      });

      if (isEmpty(signInResponse?.organizationId)) return;
      router.push('/valid-tzd');
    } catch (e) {
      console.error('Error logging in with wallet', e);
      await signOut();
    }
  };

  const registerSubOrganization = async (): Promise<ISubOrganization> => {
    if (!session?.user?.email) return {} as ISubOrganization;
    const { email } = session.user;

    const challenge = generateRandomBuffer();
    const encodedChallenge = base64UrlEncode(challenge);
    const attestation = await getPasskeyAttestation(email, challenge);

    const response = await createSubOrganization({
      email,
      attestation,
      encodedChallenge,
      deployAccount: true,
    });

    if (!response?.subOrganizationId) {
      console.error('Error creating sub organization');
      return {} as ISubOrganization;
    }

    setOrganizationInfo({
      ...response,
    });

    return response;
  };

  const emailRecovery = async (email: string): Promise<boolean> => {
    const user = await getUserSubOrganization(email);
    if (!user) return false;
    if (!authIframeClient) return false;
    await startEmailRecovery({
      email,
      key: authIframeClient.iframePublicKey!,
    });
    return true;
  };

  const getChain = (): Chain => {
    const { VERCEL_ENV: environment } = process.env;

    if (environment === 'production') {
      return polygon;
    }

    return polygonAmoy;
  };

  const connectWallet = async () => {
    if (!organizationInfo) return;

    const { subOrganizationId, walletAddress } = organizationInfo;
    const chain = getChain();

    const stamperClient = new TurnkeyClient(
      { baseUrl: turnkeyConfig.apiBaseUrl },
      passkeyClient!.config.stamper!,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    const localAccount = await createAccount({
      client: stamperClient,
      organizationId: subOrganizationId,
      signWith: walletAddress,
      ethereumAddress: walletAddress,
    });

    const smartAccountClient = createWalletClient({
      account: localAccount,
      chain: chain,
      transport: http(BUNDLE_RPC),
    });

    const smartAccountSigner =
      walletClientToSmartAccountSigner(smartAccountClient);

    const publicClient = createPublicClient({
      chain: chain,
      transport: http(BUNDLE_RPC),
    }) as PublicClient;

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

    const kernelClient = createKernelAccountClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      account: zeroDevKernelAccount as any,
      chain: chain,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      bundlerTransport: http(BUNDLE_RPC),
    });

    return {
      kernelClient,
      publicClient,
    };
  };

  useEffect(() => {
    if (session?.user?.email && !organizationInfo) {
      const { email } = session.user;
      getUserSubOrganization(email)
        .then((subOrganization) => {
          if (!subOrganization) return;
          setOrganizationInfo(subOrganization);
        })
        .catch(console.error);
    }
  }, [session, organizationInfo]);

  return {
    organizationInfo,
    walletLogin,
    registerSubOrganization,
    currentChain,
    emailRecovery,
    validCredentials,
    registerNewPasskey,
    connectWallet,
  };
};

export default useGlobalAccount;
