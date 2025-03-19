'use client';
import config from '@/config';
import { turnkeyConfig } from '@/config/turnkey';
import { IPasskeyAttestation } from '@/types/wallet';
import { getWebAuthnAttestation } from '@turnkey/http';
import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export const usePasskey = () => {
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState<boolean | null>(null);

  const validatePasskeyAvailability = async (): Promise<boolean> => {
    // Availability of "window.PublicKeyCredential" means WebAuthn is usable.
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
    try {
      // "isUserVerifyingPlatformAuthenticatorAvailable" means the feature detection is usable.
      if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        return false;

      // "isConditionalMediationAvailable" means the feature detection is usable.
      if (!PublicKeyCredential.isConditionalMediationAvailable) return false;

      // Check if user verifying platform authenticator is available.
      const results = await Promise.allSettled([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.(),
        PublicKeyCredential.isConditionalMediationAvailable?.(),
      ]);

      return results.every(
        (result: PromiseSettledResult<boolean>) =>
          result.status === 'fulfilled' && result.value,
      );
    } catch (e: unknown) {
      Sentry.captureException(e);
      return false;
    }
  };

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

  const getNewUserPasskey = async (
    email: string,
  ): Promise<{
    attestation: IPasskeyAttestation;
    encodedChallenge: string;
  }> => {
    const challenge = generateRandomBuffer();
    const encodedChallenge = base64UrlEncode(challenge);
    const authenticatorUserId = generateRandomBuffer();

    let authenticatorName = `${email} @ DIMO`;

    if (config.environment !== 'production') {
      authenticatorName += ` ${config.environment}`;
    }

    const attestation = await getWebAuthnAttestation({
      publicKey: {
        rp: {
          id: turnkeyConfig.rpId,
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
          name: authenticatorName,
          displayName: authenticatorName,
        },
        timeout: 300_000,
        authenticatorSelection: {
          requireResidentKey: false,
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      },
    });

    return { attestation, encodedChallenge };
  };

  useEffect(() => {
    validatePasskeyAvailability().then((isAvailable) => {
      console.info('Passkey available:', isAvailable);
      setIsPasskeyAvailable(isAvailable);
    });
  }, []);

  return { isPasskeyAvailable, getNewUserPasskey };
};

export default usePasskey;
