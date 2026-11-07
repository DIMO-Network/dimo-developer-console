'use client';
import { useTranslations } from 'next-intl';
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
// a grant dex may not have indexed the signer yet. Session and challenge
// errors fail at once as MemberDevJwtError; a
// signing error is rethrown unchanged. dex checks the domain.
export const useMemberDevJwt = () => {
  const t = useTranslations('common');
  const { validateCurrentSession } = useGlobalAccount();
  return useCallback(
    async ({ clientId, domain }: { clientId: string; domain: string }) => {
      const session = await validateCurrentSession();
      if (!session) throw new MemberDevJwtError(t('memberJwt.sessionExpired'));
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
            t('memberJwt.challengeFailed', {
              status: challenge.status || t('memberJwt.noAnswer'),
            }),
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
            t('memberJwt.connectFailed', { status: status || t('memberJwt.noAnswer') }),
          );
        }
        if (attempt < MEMBER_JWT_ATTEMPTS) await wait(MEMBER_JWT_RETRY_MS);
      }
      throw new MemberDevJwtError(t('memberJwt.propagating'));
    },
    [validateCurrentSession, t],
  );
};
