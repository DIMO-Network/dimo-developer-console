'use client';
import { useEffect, useRef } from 'react';
import { getAddress } from 'viem';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { registerSigner } from '@/actions/teams';
import { buildSignerProofMessage } from '@/utils/signerProof';
import { getFromSession, saveToSession } from '@/utils/sessionStorage';
import { SIGNER_IN_USE_MESSAGE, signerLocked } from '@/config/teamCopy';

export const signerRegisteredKey = (eoa: string) =>
  `signerRegistered:${eoa.toLowerCase()}`;

// Tells console-api which EOA this user signs with (contracts C6), so an owner
// can grant it data access. Once per browser session per wallet; a refusal
// other than the two 409s is retried on the next session.
export const useSignerRegistration = (lockOwnerEmail: string | null): void => {
  const { currentUser, validateCurrentSession } = useGlobalAccount();
  const wallet = currentUser?.walletAddress;
  // The teams load after this starts; read the owner at toast time.
  const lockOwner = useRef(lockOwnerEmail);
  lockOwner.current = lockOwnerEmail;

  useEffect(() => {
    if (!wallet) return;
    const key = signerRegisteredKey(wallet);
    if (getFromSession<unknown>(key)) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await validateCurrentSession();
        if (!session || cancelled) return;
        const { getSessionEoaAccount } = await import('@/services/turnkeyAccount');
        const account = await getSessionEoaAccount(session);
        const message = buildSignerProofMessage({
          eoa: session.walletAddress,
          kernelAddress: session.smartContractAddress,
          issuedAt: new Date().toISOString(),
        });
        const signature = await account.signMessage({ message });
        const result = await registerSigner({
          address: getAddress(session.walletAddress),
          message,
          signature,
        });
        if (result.ok) return saveToSession(key, 'done');
        if (result.code === 'SIGNER_LOCKED' || result.code === 'SIGNER_IN_USE') {
          saveToSession(key, 'blocked');
          toast.error(
            result.code === 'SIGNER_LOCKED'
              ? signerLocked(lockOwner.current ?? 'the team owner')
              : SIGNER_IN_USE_MESSAGE,
          );
          return;
        }
        Sentry.captureMessage(`Signer proof refused: ${result.code ?? result.status}`);
      } catch (error) {
        Sentry.captureException(error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);
};
