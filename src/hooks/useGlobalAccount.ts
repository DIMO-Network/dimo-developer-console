'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTurnkey } from '@turnkey/sdk-react';
import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import { useSession } from 'next-auth/react';
import { IPasskeyAttestation, ISubOrganization } from '@/types/wallet';
import { useRouter } from 'next/navigation';
import { getWebAuthnAttestation, TurnkeyClient } from '@turnkey/http';
import { isEmpty } from 'lodash';
import configuration from '@/config';
import { signOut } from 'next-auth/react';
import { turnkeyConfig } from '@/config/turnkey';
import { createAccount } from '@turnkey/viem';
import { Chain, createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { ENTRYPOINT_ADDRESS_V07, walletClientToSmartAccountSigner } from 'permissionless';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { KernelEIP1193Provider } from '@zerodev/wallet';
import { baseTokenAddresses, createKernelDefiClient } from '@zerodev/defi';
import config from '@/config';

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

  const connectWallet = async () => {
    if (!organizationInfo) return;
    console.info('Connecting wallet');
    const { subOrganizationId, walletAddress } = organizationInfo;

    const chain = getChain();

    const stamperClient = new TurnkeyClient(
      {
        baseUrl: turnkeyConfig.apiBaseUrl,
      },
      passkeyClient!.config.stamper!,
    );

    const localAccount = await createAccount({
      client: stamperClient,
      organizationId: subOrganizationId,
      signWith: walletAddress,
      ethereumAddress: walletAddress,
    });

    const bundleRpc = process.env.NEXT_PUBLIC_BUNDLER_RPC!;

    const smartAccountClient = createWalletClient({
      account: localAccount,
      chain: chain,
      transport: http(bundleRpc)
    });

    const smartAccountSigner =
      walletClientToSmartAccountSigner(smartAccountClient);

    const publicClient = createPublicClient({
      chain: chain,
      transport: http(bundleRpc),
    });

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
      account: zeroDevKernelAccount,
      chain: chain,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      bundlerTransport: http(bundleRpc),

    });


    //return new KernelEIP1193Provider(kernelClient);

    //await walletConnectKernelService.connect("wc:b31c3d6762c84ce15d3bf8b0c250d5a6a7ea5188ef09c6e8e25775b45ef6c3cd@2?expiryTimestamp=1728578837&relay-protocol=irn&symKey=65477b960e7430a6591fd3ea70d7f727624150145b2d063e1abcd1bcd28099ea");
  };

  const getChain = (): Chain => {
    const { VERCEL_ENV: environment } = process.env;

    if (environment === "production") {
      return polygon;
    }

    return polygonAmoy;
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
    connectWallet
  };
};

export default useGlobalAccount;
