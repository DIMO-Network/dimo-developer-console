'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTurnkey } from '@turnkey/sdk-react';
import { TurnkeySDKApiTypes, WebauthnStamper } from '@turnkey/sdk-browser';
import { createSubOrganization, createWallet, getUserSubOrganization, userEmailAuth } from '@/services/globalAccount';
import { useSession } from 'next-auth/react';
import { ISubOrganization, IWallet } from '@/types/wallet';
import { useRouter } from 'next/navigation';
import { getWebAuthnAttestation } from '@turnkey/http';
import { isEmpty } from 'lodash';
import useUser from '@/hooks/useUser';


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
  const { authIframeClient, passkeyClient, getActiveClient } = useTurnkey();
  const [authBundle, setAuthBundle] = useState<string | null>(null);
  const [validCredentials, setValidCredentials] = useState<boolean>(false);
  const [organizationInfo, setOrganizationInfo] = useState<ISubOrganization | null>(null);

  const generateSessionCookie = async (readOnlySession: TurnkeySDKApiTypes.TCreateReadOnlySessionResponse) => {
/**
 *
 *
 * */
  };

  const createSession = async () => {
    if (!authIframeClient) return;
    // a bit hacky but works for now
    const { organizationId } = await authIframeClient.getWhoami();
    const response = await authIframeClient.createReadOnlySession({
      organizationId,
    });
  };

  const login = async () : Promise<boolean> => {
    const { subOrganizationId, hasPasskey } = organizationInfo!;
    const {email} = session!.user!;

    if (hasPasskey) {
      // a bit hacky but works for now
      const signInResponse = await passkeyClient?.createReadOnlySession({
        organizationId: subOrganizationId,
      });

      console.info(signInResponse);

      return !isEmpty(signInResponse?.organizationId);
    } else {
      const signInResponse = await userEmailAuth({
        email: email!,
        targetPublicKey: authIframeClient!.iframePublicKey as string,
        magicLink: `http://${window.location.host}/sign-up?flow=wallet-creation&continueWith=email&bundle=%s`,
      });
      return !isEmpty(signInResponse?.subOrganizationId);
    }
  };

  const loginAndRedirect = async () : Promise<void> => {
    const success = await login();
    if (!success) return;
    const { hasPasskey } = organizationInfo!;
    if (hasPasskey) {
      router.push('/valid-tzd');
      return;
    }

    router.push('/verify-email');
  };

  const registerNewWallet  = async () : Promise<IWallet> => {
    if (!session?.user?.email) return {} as IWallet;
    const { subOrganizationId, hasPasskey } = organizationInfo!;
    const client = hasPasskey ? new WebauthnStamper({ rpId: passkeyClient!.rpId }) : authIframeClient?.config.stamper;
    return await createWallet(subOrganizationId, client!);
  };

  const registerSubOrganization = async (isPasskey?: boolean) : Promise<{ success: boolean; emailSent: boolean; } > => {
    if (!session?.user?.email) return { success: false, emailSent: !isPasskey, };
    const { email } = session.user;

    let encodedChallenge;
    let attestation;

    if (isPasskey) {
      const challenge = generateRandomBuffer();
      const authenticatorUserId = generateRandomBuffer();
      encodedChallenge = base64UrlEncode(challenge);
      attestation = await getWebAuthnAttestation({
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
        }
      });
    }

    const response = await createSubOrganization({
      email,
      attestation,
      encodedChallenge,
    });

    if (!response?.subOrganizationId) {
      console.error('Error creating sub organization');
      return { success: false, emailSent: !isPasskey, };
    }

    setOrganizationInfo({
      subOrganizationId: response.subOrganizationId,
      hasPasskey: isPasskey ?? false,
    });

    const success = await login();

    return {
      success,
      emailSent: !isPasskey,
    };
  };

  useEffect(() => {
    if (session?.user?.email && !organizationInfo) {
      const { email } = session.user;
      getUserSubOrganization(email).then((subOrganization) => {
        if (!subOrganization) return;
        setOrganizationInfo(subOrganization);
      });
    }
  }, [session, organizationInfo]);

  useEffect(() => {
    if (!organizationInfo) return;
    if (!authBundle) return;
    if (!authIframeClient) return;
    authIframeClient.injectCredentialBundle(authBundle).then(setValidCredentials);
  }, [authBundle, authIframeClient, organizationInfo]);

  return {
    setAuthBundle,
    organizationInfo,
    loginAndRedirect,
    registerSubOrganization,
    registerNewWallet,
    validCredentials,
  };
};

export default useGlobalAccount;

