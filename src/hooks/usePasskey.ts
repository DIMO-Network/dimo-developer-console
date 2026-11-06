'use client';
import config from '@/config';
import { turnkeyConfig } from '@/config/turnkey';
import { IPasskeyAttestation } from '@/types/wallet';
import { getWebAuthnAttestation } from '@turnkey/http';
import { usePasskeyAvailability } from './usePasskeyAvailability';

export const usePasskey = () => {
  const { isPasskeyAvailable } = usePasskeyAvailability();

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

  return { isPasskeyAvailable, getNewUserPasskey };
};

export default usePasskey;
