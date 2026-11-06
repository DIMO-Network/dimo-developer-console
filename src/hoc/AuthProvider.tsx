import { exchangeDimoToken } from '@/actions/dimoAuth';
import { AuthContext } from '@/context/AuthContext';
import type { TurnkeyCredential } from '@/services/consoleSignIn';
import { isLive, onSessionChange, readSession } from '@/utils/globalAccountSession';
import config from '@/config';
import React, { ComponentType, useEffect, useRef, useState } from 'react';
import { decodeJwtToken } from '@/utils/middlewareUtils';
import { useRouter } from 'next/navigation';
import { useMixPanel } from '@/hooks/useMixPanel';
import { queryClient } from '@/hoc/QueryProvider';
import { createOAuthState, takeOAuthState } from '@/utils/oauthState';
import { whenIdle } from '@/utils/whenIdle';

// The sign-in steps bring the wallet stack (Turnkey, ZeroDev, viem: about 300 KB
// gzipped), which the sign-in and sign-up pages don't need to show themselves.
// They load once the page is idle; a step asked for sooner waits for them.
const signInSteps = () => import('@/services/consoleSignIn');

const preloadWhenIdle = () =>
  whenIdle(() => void signInSteps().catch(() => undefined), {
    timeout: 2_000,
    fallback: 1_000,
  });

export const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const router = useRouter();
    const { trackEvent } = useMixPanel();
    const [user, setUser] = useState<{
      email: string;
      subOrganizationId: string;
    } | null>(null);
    // Set once this tab stores a session itself: sign-up goes on to ask for
    // company details on this page, and coming back to the tab must not skip
    // them by following that session to /app.
    const signedInHere = useRef(false);

    const loginWithPasskey = async ({
      currentWalletValue,
      existOnDevConsole,
    }: {
      currentWalletValue?: `0x${string}` | null;
      existOnDevConsole: boolean;
    }): Promise<{
      success: boolean;
      newWalletAddress?: `0x${string}`;
    }> => {
      const { subOrganizationId } = user!;

      if (!subOrganizationId) return { success: false };

      const { passkeyCredential } = await signInSteps();
      const credential = await passkeyCredential(subOrganizationId);
      if (!credential) return { success: false };

      const newWalletAddress = await signIn(credential, {
        currentWalletValue,
        existsOnDevConsole: existOnDevConsole,
      });

      trackEvent('Sign In', {
        'distinct_id': newWalletAddress!,
        'Sign In Method': 'Passkey',
      });

      return { success: true, newWalletAddress };
    };

    const beginOtpLogin = async () => {
      const { email } = user!;
      if (!email) {
        throw new Error('No organization found');
      }
      const { sendEmailCode } = await signInSteps();
      return sendEmailCode(email);
    };

    const completeOtpLogin = async ({
      otp,
      otpId,
      currentWalletValue,
      existOnDevConsole,
    }: {
      otp: string;
      otpId: string;
      currentWalletValue?: `0x${string}` | null;
      existOnDevConsole: boolean;
    }): Promise<{ success: boolean; newWalletAddress?: `0x${string}` }> => {
      const { email } = user!;
      if (!email) return { success: false };

      const { emailCodeCredential } = await signInSteps();
      const credential = await emailCodeCredential({ email, otpId, otp });
      if (!credential) return { success: false };

      const newWalletAddress = await signIn(credential, {
        currentWalletValue,
        existsOnDevConsole: existOnDevConsole,
      });

      trackEvent('Sign In', {
        'distinct_id': newWalletAddress!,
        'Sign In Method': 'OTP',
      });

      return { success: true, newWalletAddress };
    };

    const signIn = async (
      credential: TurnkeyCredential,
      {
        currentWalletValue,
        existsOnDevConsole,
      }: { currentWalletValue?: `0x${string}` | null; existsOnDevConsole: boolean },
    ) => {
      const account = user!;
      const { signIntoDimo, storeConsoleSession } = await signInSteps();
      const { token, newWalletAddress } = await signIntoDimo({
        account,
        credential,
        currentWalletValue,
        existsOnDevConsole,
      });

      await storeConsoleSession({
        account,
        credential,
        accessToken: token.access_token,
        // A new session starts with an empty query cache: the user and team
        // queries are not keyed by account, and a session that ended without a
        // logout (it expired) leaves the last person's data in this tab. Stored
        // developer JWTs and the active team are kept only for the same account.
        beforeWrite: () => {
          queryClient.clear();
          signedInHere.current = true;
        },
      });

      return newWalletAddress;
    };

    const handleExternalAuth = (provider: string) => {
      const state = createOAuthState();
      if (!state) {
        console.error('Sign-in with an external provider needs sessionStorage');
        return;
      }
      const url = `${process.env.NEXT_PUBLIC_DIMO_AUTH_URL}/auth/${provider}?client_id=developer-platform&redirect_uri=${config.frontendUrl}sign-in&response_type=code&scope=openid profile email&state=${state}`;
      trackEvent('Sign In Attempt', {
        'type': 'External Auth',
        'Sign In Method': provider,
      });
      window.location.href = url;
    };

    const completeExternalAuth = async (
      code: string,
      state: string | null,
    ): Promise<{ success: boolean; email: string }> => {
      if (!takeOAuthState(state)) return { success: false, email: '' };
      const token = await exchangeDimoToken(code);
      const payload = await decodeJwtToken(token.access_token);
      const { email } = payload;
      return { success: true, email: email as string };
    };

    const loadUserInformation = async (): Promise<boolean> => {
      const session = readSession();

      if (!session) {
        return false;
      }

      // An expired session is left alone: tabs still open on the console offer
      // to sign in again with it (SessionExpiredDialog), and a sign-in here
      // replaces it.
      if (!isLive(session)) {
        return false;
      }

      return true;
    };

    useEffect(preloadWhenIdle, []);

    // A live session goes to /app: the one found on arrival, one signed in to
    // in another tab, or one found when the user comes back to this tab.
    useEffect(() => {
      const follow = () => {
        if (signedInHere.current) return;
        void loadUserInformation().then((isValid) => {
          if (isValid) router.replace('/app');
        });
      };
      const onVisible = () => {
        if (document.visibilityState === 'visible') follow();
      };

      follow();
      window.addEventListener('focus', follow);
      document.addEventListener('visibilitychange', onVisible);
      const off = onSessionChange((event) => {
        if (event.type === 'signed-in') follow();
      });

      return () => {
        window.removeEventListener('focus', follow);
        document.removeEventListener('visibilitychange', onVisible);
        off();
      };
      // Once per mount; the store is read when it is needed.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <AuthContext.Provider
        value={{
          setUser,
          loginWithPasskey,
          beginOtpLogin,
          completeOtpLogin,
          handleExternalAuth,
          completeExternalAuth,
        }}
      >
        <WrappedComponent {...props} />
      </AuthContext.Provider>
    );
  };

  HOC.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return HOC;
};

export default withAuth;
