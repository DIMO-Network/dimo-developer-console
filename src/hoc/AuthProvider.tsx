import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { passkeyClient, turnkeyClient } from '@/config/turnkey';
import { AuthContext } from '@/context/AuthContext';
import { useGlobalAccount } from '@/hooks';
import { getUserSubOrganization, initOtpLogin, otpLogin } from '@/services/globalAccount';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  removeFromLocalStorage,
  EmbeddedKey,
  saveToLocalStorage,
} from '@/utils/localStorage';
import {
  saveToSession,
  GlobalAccountSession,
  getFromSession,
  removeFromSession,
} from '@/utils/sessionStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { isEmpty } from 'lodash';
import { useRouter } from 'next/navigation';
import { ComponentType, useState } from 'react';
const halfHour = 30 * 60;
const fifteenMinutes = 15 * 60;

export const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const { getWalletAddress, signMessage } = useGlobalAccount();
    const router = useRouter();
    const [user, setUser] = useState<Partial<IGlobalAccountSession> | null>(null);

    const getWalletsAndSmartContract = async (credentials: string) => {};

    const getUserDetails = async (email: string) => {
      const information = await getUserSubOrganization(email);
      if (!information) {
        return null;
      }

      const consolodatedInformation = {
        organization: information,
        role: 'owner',
        token: '',
      };

      saveToSession<IGlobalAccountSession>(GlobalAccountSession, consolodatedInformation);
      return consolodatedInformation;
    };

    const loginWithPasskey = async () => {
      const { organization } = user!;

      if (!organization) {
        throw new Error('No organization found');
      }

      const { subOrganizationId, email } = organization;

      const key = generateP256KeyPair();
      const targetPubHex = key.publicKeyUncompressed;
      const nowInSeconds = Math.ceil(Date.now() / 1000);

      const { credentialBundle } = await passkeyClient.createReadWriteSession({
        organizationId: subOrganizationId,
        targetPublicKey: targetPubHex,
        expirationSeconds: (nowInSeconds + halfHour).toString(),
      });

      if (isEmpty(credentialBundle)) return;

      saveToLocalStorage(EmbeddedKey, key.privateKey);

      const { walletAddress, smartContractAddress } = await getWalletAddress({
        subOrganizationId: subOrganizationId!,
        authKey: credentialBundle,
      });

      const { challenge, state } = await getDimoChallenge(smartContractAddress);

      const signedChallenge = await signMessage({
        subOrganizationId: subOrganizationId!,
        walletAddress: walletAddress,
        authKey: credentialBundle,
        message: challenge,
      });

      const token = await getDimoToken(state, signedChallenge);

      setUser({
        organization: {
          subOrganizationId: subOrganizationId,
          email: email,
          walletAddress: walletAddress,
          smartContractAddress: smartContractAddress,
        },
        role: 'owner',
        session: {
          token: credentialBundle,
          expiry: Math.ceil(Date.now() / 1000) + fifteenMinutes,
        },
        token: token.access_token,
      });
      router.push('/app');
    };

    const beginOtpLogin = async () => {
      const { organization } = user!;
      if (!organization) {
        throw new Error('No organization found');
      }
      const { email } = organization;
      const { otpId } = await initOtpLogin(email!);
      return otpId;
    };

    const completeOtpLogin = async ({ otp, otpId }: { otp: string; otpId: string }) => {
      const { organization } = user!;
      if (!organization) {
        return;
      }
      const { email, subOrganizationId } = organization;
      const key = generateP256KeyPair();
      const targetPublicKey = key.publicKeyUncompressed;
      const { credentialBundle } = await otpLogin({
        email: email!,
        otpId: otpId,
        otpCode: otp,
        key: targetPublicKey,
      });

      if (isEmpty(credentialBundle)) return;

      saveToLocalStorage(EmbeddedKey, key.privateKey);

      const { walletAddress, smartContractAddress } = await getWalletAddress({
        subOrganizationId: subOrganizationId!,
        authKey: credentialBundle,
      });

      const { challenge, state } = await getDimoChallenge(smartContractAddress);

      const signedChallenge = await signMessage({
        subOrganizationId: subOrganizationId!,
        walletAddress: walletAddress,
        authKey: credentialBundle,
        message: challenge,
      });

      const token = await getDimoToken(state, signedChallenge);

      setUser({
        organization: {
          subOrganizationId: subOrganizationId,
          email: email,
          walletAddress: walletAddress,
          smartContractAddress: smartContractAddress,
        },
        role: 'owner',
        session: {
          token: credentialBundle,
          expiry: Math.ceil(Date.now() / 1000) + fifteenMinutes,
        },
        token: token.access_token,
      });

      router.push('/app');
    };

    const logout = async () => {
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
      await turnkeyClient.logoutUser();
    };

    const handleExternalAuth = (provider: string) => {
      const url = `${process.env.NEXT_PUBLIC_DIMO_AUTH_URL}/auth/${provider}?client_id=developer-platform&redirect_uri=${window.location.origin}&response_type=code&scope=openid profile email`;
      window.location.href = url;
    };

    return (
      <AuthContext.Provider
        value={{
          setUser,
          getUserDetails,
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
