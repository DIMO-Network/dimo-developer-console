import { exchangeDimoToken, getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { endSession, saveToken } from '@/actions/user';
import { completeUserData, createNewUser } from '@/app/sign-up/actions';
import { SignUpRefusedError } from '@/app/sign-up/signUpResult';
import { passkeyClient, turnkeyClient } from '@/config/turnkey';
import { AuthContext } from '@/context/AuthContext';
import { initOtpLogin, otpLogin } from '@/services/globalAccount';
import { getTurnkeyWalletAddress, getTurnkeyClient } from '@/services/turnkey';
import { getKernelAccount } from '@/services/zerodev';
import {
  clearSession,
  isLive,
  onSessionChange,
  readSession,
  writeSession,
} from '@/utils/globalAccountSession';
import { generateP256KeyPair } from '@turnkey/crypto';
import { isEmpty } from 'lodash';
import config from '@/config';
import React, { ComponentType, useEffect, useRef, useState } from 'react';
import { decodeJwtToken } from '@/utils/middlewareUtils';
import { useRouter } from 'next/navigation';
import { useMixPanel } from '@/hooks';
import { queryClient } from '@/hoc/QueryProvider';
import { startConsoleSession } from '@/utils/consoleSession';
import { createOAuthState, takeOAuthState } from '@/utils/oauthState';
const halfHour = 60 * 30;
const fifteenMinutes = 15 * 60;

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

    const createSession = async ({
      accessToken,
      sessionExpiration,
      tokenExpiration,
      credentialBundle,
      privateKey,
    }: {
      credentialBundle: string;
      privateKey: string;
      accessToken: string;
      tokenExpiration: number;
      sessionExpiration: number;
    }) => {
      await saveToken(accessToken, tokenExpiration);
      // A new session starts with an empty query cache: the user and team
      // queries are not keyed by account, and a session that ended without a
      // logout (it expired) leaves the last person's data in this tab. Stored
      // developer JWTs and the active team are kept only for the same account.
      queryClient.clear();
      startConsoleSession(user!.subOrganizationId);

      signedInHere.current = true;
      // One entry for every tab, the bundle with the key it was encrypted to;
      // the other tabs hear of it.
      writeSession({
        email: user!.email,
        role: 'owner',
        subOrganizationId: user!.subOrganizationId,
        token: credentialBundle,
        expiry: sessionExpiration,
        eKey: privateKey,
      });
    };

    const signIntoDimo = async ({
      credentialBundle,
      privateKey,
      existsOnDevConsole,
      currentWalletValue,
    }: {
      credentialBundle: string;
      privateKey: string;
      existsOnDevConsole: boolean;
      currentWalletValue?: `0x${string}` | null;
    }) => {
      const { subOrganizationId } = user!;
      const client = getTurnkeyClient({ authKey: credentialBundle, eKey: privateKey });
      const walletAddress = await getTurnkeyWalletAddress({
        subOrganizationId: subOrganizationId,
        client: client,
      });

      const kernelAccount = await getKernelAccount({
        subOrganizationId: subOrganizationId,
        walletAddress: walletAddress,
        client: client,
      });

      const { challenge, state } = await getDimoChallenge({
        address: kernelAccount.address,
        domain: `${config.frontendUrl}sign-in`,
        clientId: 'developer-platform',
      });

      const signedChallenge = await kernelAccount.signMessage({
        message: challenge,
      });

      const token = await getDimoToken({
        state: state,
        signedChallenge: signedChallenge,
        clientId: 'developer-platform',
        domain: `${config.frontendUrl}sign-in`,
      });

      if (isEmpty(token)) {
        throw new Error('Could not login to Dimo');
      }

      if (!existsOnDevConsole) {
        const created = await createNewUser(
          {
            name: user!.email,
            email: user!.email,
            address: kernelAccount.address,
            auth: 'credentials',
            auth_login: user!.email,
          },
          token.access_token,
        );
        if (!created.ok) throw new SignUpRefusedError(created.reason);
      }

      if (existsOnDevConsole && currentWalletValue !== kernelAccount.address) {
        const completed = await completeUserData(
          {
            email: user!.email,
            address: kernelAccount.address,
          },
          token.access_token,
        );
        if (!completed.ok) throw new SignUpRefusedError(completed.reason);
      }

      return { token, newWalletAddress: kernelAccount.address };
    };

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

      const key = generateP256KeyPair();
      const targetPubHex = key.publicKeyUncompressed;
      const nowInSeconds = Math.ceil(Date.now() / 1000);

      const sessionExpiration = nowInSeconds + halfHour;

      // A window in seconds, not a point in time: the key lasts as long as the
      // console session.
      const { credentialBundle } = await passkeyClient.createReadWriteSession({
        organizationId: subOrganizationId,
        targetPublicKey: targetPubHex,
        expirationSeconds: String(halfHour),
      });

      if (isEmpty(credentialBundle)) return { success: false };

      const { token, newWalletAddress } = await signIntoDimo({
        credentialBundle,
        privateKey: key.privateKey,
        currentWalletValue,
        existsOnDevConsole: existOnDevConsole,
      });

      await createSession({
        accessToken: token.access_token,
        tokenExpiration: halfHour, // for cookie expiration
        sessionExpiration: sessionExpiration, // for session expiration
        credentialBundle,
        privateKey: key.privateKey,
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
      const { otpId } = await initOtpLogin(email!);
      return otpId;
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

      const key = generateP256KeyPair();
      const targetPublicKey = key.publicKeyUncompressed;
      const { credentialBundle } = await otpLogin({
        email: email!,
        otpId: otpId,
        otpCode: otp,
        key: targetPublicKey,
      });

      if (isEmpty(credentialBundle)) return { success: false };

      const nowInSeconds = Math.ceil(Date.now() / 1000);
      const sessionExpiration = nowInSeconds + fifteenMinutes;

      const { token, newWalletAddress } = await signIntoDimo({
        credentialBundle,
        privateKey: key.privateKey,
        currentWalletValue,
        existsOnDevConsole: existOnDevConsole,
      });

      await createSession({
        accessToken: token.access_token,
        tokenExpiration: fifteenMinutes, // for cookie expiration
        sessionExpiration: sessionExpiration, // for session expiration
        credentialBundle,
        privateKey: key.privateKey,
      });

      trackEvent('Sign In', {
        'distinct_id': newWalletAddress!,
        'Sign In Method': 'OTP',
      });

      return { success: true, newWalletAddress };
    };

    // Reached when the shared session expired (loadUserInformation).
    const logout = async () => {
      // This runs on a login page, which the proxy lets an action through on
      // without a session, so there is no 401 here. It can still fail: a 307
      // to /app while the cookie is valid, or the network. The store is
      // cleared either way.
      try {
        await endSession();
      } catch {
        // Best effort; the cookie expires with the session.
      }
      try {
        await turnkeyClient.logout();
      } catch {
        // Local only; the store below is what holds the session.
      }
      // Every other tab hears this and goes to sign-in.
      clearSession();
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

      if (!isLive(session)) {
        await logout();
        return false;
      }

      return true;
    };

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
          logout,
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
