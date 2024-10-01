'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTurnkey } from '@turnkey/sdk-react';
import {
  createSubOrganization,
  getUserSubOrganization, startEmailRecovery
} from '@/services/globalAccount';
import { useSession } from 'next-auth/react';
import { ISubOrganization } from '@/types/wallet';
import { useRouter } from 'next/navigation';
import { getWebAuthnAttestation } from '@turnkey/http';
import { isEmpty } from 'lodash';
import configuration from '@/config';
import { signOut } from 'next-auth/react';

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
    const authenticatorUserId = generateRandomBuffer();
    const encodedChallenge = base64UrlEncode(challenge);

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
    emailRecovery
  };
};

export default useGlobalAccount;
