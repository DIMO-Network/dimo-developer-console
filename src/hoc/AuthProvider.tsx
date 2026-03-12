import { exchangeDimoToken, getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { saveToken, signOut } from '@/actions/user';
import { completeUserData, createNewUser } from '@/app/sign-up/actions';
import { passkeyClient, turnkeyClient } from '@/config/turnkey';
import { AuthContext } from '@/context/AuthContext';
import { initOtpLogin, otpLogin } from '@/services/globalAccount';
import { getTurnkeyWalletAddress, getTurnkeyClient } from '@/services/turnkey';
import { getKernelAccount } from '@/services/zerodev';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  removeFromLocalStorage,
  EmbeddedKey,
  saveToLocalStorage,
  getFromLocalStorage,
} from '@/utils/localStorage';
import {
  saveToSession,
  GlobalAccountSession,
  removeFromSession,
  getFromSession,
} from '@/utils/sessionStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { isEmpty } from 'lodash';
import config from '@/config';
import React, { ComponentType, useEffect, useState } from 'react';
import { decodeJwtToken } from '@/utils/middlewareUtils';
import { useRouter } from 'next/navigation';
import { useMixPanel } from '@/hooks';
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
      saveToLocalStorage(EmbeddedKey, privateKey);

      saveToSession<IGlobalAccountSession>(GlobalAccountSession, {
        email: user!.email,
        role: 'owner',
        subOrganizationId: user!.subOrganizationId,
        token: credentialBundle,
        expiry: sessionExpiration,
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
        await createNewUser(
          {
            name: user!.email,
            email: user!.email,
            address: kernelAccount.address,
            auth: 'credentials',
            auth_login: user!.email,
          },
          token.access_token,
        );
      }

      if (existsOnDevConsole && currentWalletValue !== kernelAccount.address) {
        await completeUserData(
          {
            email: user!.email,
            address: kernelAccount.address,
          },
          token.access_token,
        );
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

      const { credentialBundle } = await passkeyClient.createReadWriteSession({
        organizationId: subOrganizationId,
        targetPublicKey: targetPubHex,
        expirationSeconds: sessionExpiration.toString(),
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

    const logout = async () => {
      await signOut();
      await turnkeyClient.logout();
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
    };

    const handleExternalAuth = (provider: string) => {
      const url = `${process.env.NEXT_PUBLIC_DIMO_AUTH_URL}/auth/${provider}?client_id=developer-platform&redirect_uri=${config.frontendUrl}sign-in&response_type=code&scope=openid profile email`;
      trackEvent('Sign In Attempt', {
        'type': 'External Auth',
        'Sign In Method': provider,
      });
      window.location.href = url;
    };

    const completeExternalAuth = async (
      code: string,
    ): Promise<{ success: boolean; email: string }> => {
      const token = await exchangeDimoToken(code);
      const payload = await decodeJwtToken(token.access_token);
      const { email } = payload;
      return { success: true, email: email as string };
    };

    const loadUserInformation = async (): Promise<boolean> => {
      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const eKey = getFromLocalStorage<string>(EmbeddedKey);

      if (!eKey || !session) {
        return false;
      }

      const { expiry } = session;

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (expiry < nowInSeconds) {
        await logout();
        return false;
      }

      return true;
    };

    useEffect(() => {
      void loadUserInformation().then((isValid) => {
        if (isValid) router.replace('/app');
      });
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
