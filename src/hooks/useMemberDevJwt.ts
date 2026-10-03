'use client';
import { useCallback } from 'react';
import { requestDexChallenge, submitDexChallenge } from '@/actions/dimoAuth';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { saveDevJwt } from '@/utils/devJwt';

export const MEMBER_JWT_ATTEMPTS = 3;
export const MEMBER_JWT_RETRY_MS = 5000;

export class MemberDevJwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemberDevJwtError';
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A member's developer JWT, signed by their own Turnkey EOA. The challenge is
// for the license (address = clientId); dex verifies it through the license
// account's ERC-1271 check. Only a submit_challenge 4xx is retried: right after
// a grant dex may not have indexed the signer yet (the RentalOS flow allows the
// same). Session and challenge errors fail at once as MemberDevJwtError; a
// signing error is rethrown unchanged. dex checks the domain.
export const useMemberDevJwt = () => {
  const { validateCurrentSession } = useGlobalAccount();
  return useCallback(
    async ({ clientId, domain }: { clientId: string; domain: string }) => {
      const session = await validateCurrentSession();
      if (!session)
        throw new MemberDevJwtError('Your session has expired. Sign in again.');
      // Lazy: @/services/turnkeyAccount pulls the Turnkey config, which needs env.
      const { getSessionEoaAccount } = await import('@/services/turnkeyAccount');
      const account = await getSessionEoaAccount(session);
      for (let attempt = 1; attempt <= MEMBER_JWT_ATTEMPTS; attempt++) {
        const challenge = await requestDexChallenge({
          address: clientId as `0x${string}`,
          clientId,
          domain,
        });
        if (!challenge.ok) {
          throw new MemberDevJwtError(
            `Couldn't start connecting to this license (${challenge.status || 'no answer'}). Try again.`,
          );
        }
        const signedChallenge = await account.signMessage({
          message: challenge.data.challenge,
        });
        const token = await submitDexChallenge({
          state: challenge.data.state,
          signedChallenge,
          clientId,
          domain,
        });
        if (token.ok && token.data.access_token) {
          saveDevJwt(clientId, token.data.access_token);
          return token.data.access_token;
        }
        const status = token.ok ? 0 : token.status;
        if (status < 400 || status >= 500) {
          throw new MemberDevJwtError(
            `Couldn't connect your wallet (${status || 'no answer'}). Try again.`,
          );
        }
        if (attempt < MEMBER_JWT_ATTEMPTS) await wait(MEMBER_JWT_RETRY_MS);
      }
      throw new MemberDevJwtError('Access is still propagating — try again in a minute');
    },
    [validateCurrentSession],
  );
};
