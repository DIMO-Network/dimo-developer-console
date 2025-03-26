import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { saveToken, signOut } from '@/actions/user';
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
} from '@/utils/localStorage';
import {
  saveToSession,
  GlobalAccountSession,
  removeFromSession,
} from '@/utils/sessionStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { isEmpty } from 'lodash';
//import { cookies } from 'next/headers';
import { ComponentType, useState } from 'react';
const halfHour = 30 * 60;
// const fifteenMinutes = 15 * 60;

export const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const [user, setUser] = useState<{
      email: string;
      subOrganizationId: string;
    } | null>(null);

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
      saveToken(accessToken, sessionExpiration);
      console.info('Session token:', accessToken);
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

      return { token, smartContractAddress: kernelAccount.address };
    };

    const loginWithPasskey = async (): Promise<{
      success: boolean;
      wallet: `0x${string}`;
    }> => {
      const { subOrganizationId } = user!;

      if (!subOrganizationId) return { success: false, wallet: '0x' };

      const key = generateP256KeyPair();
      const targetPubHex = key.publicKeyUncompressed;
      const nowInSeconds = Math.ceil(Date.now() / 1000);

      const sessionExpiration = nowInSeconds + halfHour;

      const { credentialBundle } = await passkeyClient.createReadWriteSession({
        organizationId: subOrganizationId,
        targetPublicKey: targetPubHex,
        expirationSeconds: sessionExpiration.toString(),
      });

      if (isEmpty(credentialBundle)) return { success: false, wallet: '0x' };

      const { token, smartContractAddress } = await signIntoDimo({
        credentialBundle,
        privateKey: key.privateKey,
      });

      await createSession({
        accessToken: token.access_token,
        sessionExpiration,
        credentialBundle,
        privateKey: key.privateKey,
      });

      return { success: true, wallet: smartContractAddress };
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
    }: {
      otp: string;
      otpId: string;
    }): Promise<{ success: boolean; wallet: `0x${string}` }> => {
      const { email } = user!;
      if (!email) return { success: false, wallet: '0x' };

      const key = generateP256KeyPair();
      const targetPublicKey = key.publicKeyUncompressed;
      const { credentialBundle } = await otpLogin({
        email: email!,
        otpId: otpId,
        otpCode: otp,
        key: targetPublicKey,
      });

      if (isEmpty(credentialBundle)) return { success: false, wallet: '0x' };

      const nowInSeconds = Math.ceil(Date.now() / 1000);
      const sessionExpiration = nowInSeconds + halfHour;

      const { token, smartContractAddress } = await signIntoDimo({
        credentialBundle,
        privateKey: key.privateKey,
      });

      await createSession({
        accessToken: token.access_token,
        sessionExpiration,
        credentialBundle,
        privateKey: key.privateKey,
      });

      return { success: true, wallet: smartContractAddress };
    };

    const logout = async () => {
      signOut();
      turnkeyClient.logout();
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
