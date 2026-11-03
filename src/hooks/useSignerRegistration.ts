'use client';
import { useEffect, useRef } from 'react';
import { getAddress } from 'viem';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { registerSigner } from '@/actions/teams';
import { buildSignerProofMessage } from '@/utils/signerProof';
import { readSession, SIGNER_PROOF_KEY } from '@/utils/globalAccountSession';
import { SIGNER_IN_USE_MESSAGE, signerLocked } from '@/config/teamCopy';

interface ProofMark {
  wallet: string;
  expiry: number;
  state: 'done' | 'blocked';
}

// The mark names the wallet and the shared sign-in's expiry
// (src/utils/globalAccountSession.ts), so every tab of one sign-in skips the
// proof once any tab has made it, and the next sign-in proves again.
const isProven = (wallet: string): boolean => {
  const expiry = readSession()?.expiry;
  if (expiry === undefined) return false;
  try {
    const mark = JSON.parse(
      localStorage.getItem(SIGNER_PROOF_KEY) ?? 'null',
    ) as ProofMark | null;
    return mark?.expiry === expiry && mark.wallet === wallet.toLowerCase();
  } catch {
    return false;
  }
};

const markProven = (wallet: string, state: ProofMark['state']): void => {
  const expiry = readSession()?.expiry;
  if (expiry === undefined) return;
  const mark: ProofMark = { wallet: wallet.toLowerCase(), expiry, state };
  localStorage.setItem(SIGNER_PROOF_KEY, JSON.stringify(mark));
};

// Tells console-api which EOA this user signs with (contracts C6), so an owner
// can grant it data access. Once per sign-in per wallet, shared by every tab; a
// refusal other than the two 409s is retried on the next sign-in.
export const useSignerRegistration = (lockOwnerEmail: string | null): void => {
  const { currentUser, validateCurrentSession } = useGlobalAccount();
  const wallet = currentUser?.walletAddress;
  // The teams load after this starts; read the owner at toast time.
  const lockOwner = useRef(lockOwnerEmail);
  lockOwner.current = lockOwnerEmail;

  useEffect(() => {
    if (!wallet) return;
    if (isProven(wallet)) return;
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
        if (result.ok) return markProven(wallet, 'done');
        if (result.code === 'SIGNER_LOCKED' || result.code === 'SIGNER_IN_USE') {
          markProven(wallet, 'blocked');
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
