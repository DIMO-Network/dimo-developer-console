import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { passkeyClient } from '@/config/turnkey';
import { AuthContext } from '@/context/AuthContext';
import { initOtpLogin, otpLogin } from '@/services/globalAccount';
import { getTurnkeyWalletAddress, getTurnkeyClient } from '@/services/turnkey';
import { getKernelAccount } from '@/services/zerodev';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  removeFromLocalStorage,
  EmbeddedKey,
  saveToLocalStorage,
} from '@/utils/localStorage';
import {
  saveToSession,
  GlobalAccountSession,
  removeFromSession,
} from '@/utils/sessionStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { isEmpty } from 'lodash';
//import { cookies } from 'next/headers';
import { useRouter } from 'next/navigation';
import { ComponentType, useState } from 'react';
const halfHour = 30 * 60;
const fifteenMinutes = 15 * 60;

export const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const router = useRouter();
    const [user, setUser] = useState<{ email: string; subOrganizationId: string } | null>(
      null,
    );

    const createSession = async ({
      accessToken,
      sessionExpiration,
      credentialBundle,
      privateKey,
    }: {
      credentialBundle: string;
      privateKey: string;
      accessToken: string;
      sessionExpiration: number;
    }) => {
      // const userCookies = await cookies();
      // userCookies.set('session-token', accessToken, { maxAge: sessionExpiration });

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
    }: {
      credentialBundle: string;
      privateKey: string;
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

      const { challenge, state } = await getDimoChallenge(kernelAccount.address);

      const signedChallenge = await kernelAccount.signMessage({
        message: challenge,
      });

      const token = await getDimoToken(state, signedChallenge);

      return token;
    };

    const loginWithPasskey = async () => {
      const { subOrganizationId, email } = user!;

      if (!subOrganizationId) {
        throw new Error('No organization found');
      }

      const key = generateP256KeyPair();
      const targetPubHex = key.publicKeyUncompressed;
      const nowInSeconds = Math.ceil(Date.now() / 1000);

      const sessionExpiration = nowInSeconds + halfHour;

      const { credentialBundle } = await passkeyClient.createReadWriteSession({
        organizationId: subOrganizationId,
        targetPublicKey: targetPubHex,
        expirationSeconds: sessionExpiration.toString(),
      });

      if (isEmpty(credentialBundle)) return;

      const token = await signIntoDimo({ credentialBundle, privateKey: key.privateKey });

      await createSession({
        accessToken: token.access_token,
        sessionExpiration,
        credentialBundle,
        privateKey: key.privateKey,
      });

      router.push('/app');
    };

    const beginOtpLogin = async () => {
      const { email } = user!;
      if (!email) {
        throw new Error('No organization found');
      }
      const { otpId } = await initOtpLogin(email!);
      return otpId;
    };

    const completeOtpLogin = async ({ otp, otpId }: { otp: string; otpId: string }) => {
      const { email } = user!;
      if (!email) {
        return;
      }
      const key = generateP256KeyPair();
      const targetPublicKey = key.publicKeyUncompressed;
      const { credentialBundle } = await otpLogin({
        email: email!,
        otpId: otpId,
        otpCode: otp,
        key: targetPublicKey,
      });

      if (isEmpty(credentialBundle)) return;

      const nowInSeconds = Math.ceil(Date.now() / 1000);
      const sessionExpiration = nowInSeconds + halfHour;

      const token = await signIntoDimo({ credentialBundle, privateKey: key.privateKey });

      await createSession({
        accessToken: token.access_token,
        sessionExpiration,
        credentialBundle,
        privateKey: key.privateKey,
      });

      router.push('/app');
    };

    const logout = async () => {
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
    };

    const handleExternalAuth = (provider: string) => {
      const url = `${process.env.NEXT_PUBLIC_DIMO_AUTH_URL}/auth/${provider}?client_id=developer-platform&redirect_uri=${window.location.origin}&response_type=code&scope=openid profile email`;
      window.location.href = url;
    };

    return (
      <AuthContext.Provider
        value={{
          setUser,
          loginWithPasskey,
          beginOtpLogin,
          completeOtpLogin,
          logout,
          handleExternalAuth,
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
