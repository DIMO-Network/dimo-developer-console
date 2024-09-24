'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTurnkey } from '@turnkey/sdk-react';
import {
  createSubOrganization,
  getUserSubOrganization,
} from '@/services/globalAccount';
import { useSession } from 'next-auth/react';
import { ISubOrganization } from '@/types/wallet';
import { useRouter } from 'next/navigation';
import { getWebAuthnAttestation } from '@turnkey/http';
import { isEmpty } from 'lodash';
import configuration from '@/config';

const generateRandomBuffer = (): ArrayBuffer => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer;
};

// All algorithms can be found here: https://www.iana.org/assignments/cose/cose.xhtml#algorithms
// We only support ES256, which is listed here
const es256 = -7;

// This constant designates the type of credential we want to create.
// The enum only supports one value, "public-key"
// https://www.w3.org/TR/webauthn-2/#enumdef-publickeycredentialtype
const publicKey = 'public-key';

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
  const { passkeyClient } = useTurnkey();
  const [organizationInfo, setOrganizationInfo] =
    useState<ISubOrganization | null>(null);
  const currentChain = useMemo(() => {
    const isAmoy = configuration.CONTRACT_NETWORK === BigInt(80_002);
    return isAmoy ? 'Polygon Amoy' : 'Polygon';
  }, []);

  const walletLogin = async (): Promise<void> => {
    const { subOrganizationId } = organizationInfo!;
    // a bit hacky but works for now
    const signInResponse = await passkeyClient?.createReadOnlySession({
      organizationId: subOrganizationId,
    });

    if (isEmpty(signInResponse?.organizationId)) return;
    router.push('/valid-tzd');
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
          name: 'DIMO Developer Console',
        },
        challenge,
        pubKeyCredParams: [
          {
            type: publicKey,
            alg: es256,
          },
        ],
        user: {
          id: authenticatorUserId,
          name: 'DIMO Developer Console',
          displayName: 'DIMO Developer Console',
        },
        authenticatorSelection: {
          requireResidentKey: true,
          residentKey: 'required',
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
  };
};

export default useGlobalAccount;
