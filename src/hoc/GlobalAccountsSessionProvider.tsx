'use client';

import React, {
  ComponentType,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { useAccountInformation, useGlobalAccount } from '@/hooks';
import { AccountInformationModal } from '@/components/AccountInformationModal';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountAuthContext';
import { otpLogin, initOtpLogin, getUserSubOrganization } from '@/services/globalAccount';
import { AuthClient } from '@turnkey/sdk-browser';
import { useRouter } from 'next/navigation';
import { passkeyClient, turnkeyClient } from '@/config/turnkey';
import * as Sentry from '@sentry/nextjs';
import { signOut, useSession } from 'next-auth/react';
import { isEmpty } from 'lodash';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  saveToSession,
  removeFromSession,
  GlobalAccountSession,
  getFromSession,
} from '@/utils/sessionStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { OtpLoginModal } from '@/components/OtpLoginModal';
import { AxiosError } from 'axios';
import { NotificationContext } from '@/context/notificationContext';
import {
  EmbeddedKey,
  removeFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/localStorage';
import { isCollaborator } from '@/utils/user';

const halfHour = 30 * 60;
const fifteenMinutes = 15 * 60;
export const withGlobalAccounts = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const router = useRouter();
    const { data: session } = useSession();
    const { getWalletAddress } = useGlobalAccount();
    const { user: { role = '' } = {} } = session ?? {};
    const { setNotification } = useContext(NotificationContext);
    const [otpId, setOtpId] = useState<string>('');
    const [shouldRedirect, setShouldRedirect] = useState<boolean>(true);
    const [hasSession, setHasSession] = useState<boolean>(false);
    const [otpModalOpen, setOtpModalOpen] = useState<boolean>(false);
    const { showAccountInformation, setShowAccountInformation } = useAccountInformation();
    const [, setResolvers] = useState<
      Array<(value: IGlobalAccountSession | null) => void>
    >([]);

    const requestOtpLogin = async (email: string) => {
      try {
        const stored = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
        if (stored && stored.session.expiry > Date.now() / 1000) {
          router.push('/valid-tzd');
          return;
        }
        console.info('Requesting OTP login');
        const { otpId: currentOtpId } = await initOtpLogin(email);
        setOtpId(currentOtpId);
        setOtpModalOpen(true);
      } catch (e: unknown) {
        Sentry.captureException(e);
        if (e instanceof AxiosError) {
          setNotification(e.response?.data.error, 'Error', 'error');
          return;
        }
        console.error('Error logging in with otp', e);
        await signOut();
      }
    };

    const completeOtpLogin = useCallback(
      async ({ otp, email }: { otp: string; email: string }) => {
        try {
          if (!otpId) return;
          const organization = await getUserSubOrganization(email);
          const key = generateP256KeyPair();
          const targetPublicKey = key.publicKeyUncompressed;
          const { credentialBundle } = await otpLogin({
            email: email,
            otpId: otpId,
            otpCode: otp,
            key: targetPublicKey,
          });

          if (isEmpty(credentialBundle)) return;

          const nowInSeconds = Date.now() / 1000;
          const currentSession = {
            organization: organization,
            session: {
              token: credentialBundle,
              expiry: nowInSeconds + fifteenMinutes,
              authenticator: AuthClient.Iframe,
            },
          };
          saveToLocalStorage(EmbeddedKey, key.privateKey);
          saveToSession<IGlobalAccountSession>(GlobalAccountSession, currentSession);
          setHasSession(true);
          setResolvers((prev) => {
            prev.forEach((resolve) => resolve(currentSession));
            return [];
          });
          if (!shouldRedirect) {
            setOtpModalOpen(false);
            return;
          }
          router.push('/valid-tzd');
        } catch (e: unknown) {
          Sentry.captureException(e);
          if (e instanceof AxiosError) {
            setNotification(e.response?.data.error, 'Error', 'error');
            return;
          }
          await signOut();
        }
      },
      [otpId, shouldRedirect],
    );

    const loginWithPasskey = async (email: string) => {
      try {
        const organization = await getUserSubOrganization(email);

        const key = generateP256KeyPair();
        const targetPubHex = key.publicKeyUncompressed;
        const nowInSeconds = Date.now() / 1000;

        const { credentialBundle } = await passkeyClient.createReadWriteSession({
          organizationId: organization.subOrganizationId,
          targetPublicKey: targetPubHex,
          expirationSeconds: (nowInSeconds + halfHour).toString(),
        });

        if (isEmpty(credentialBundle)) return;

        const { walletAddress, smartContractAddress } = await getWalletAddress({
          subOrganizationId: organization.subOrganizationId,
          authKey: credentialBundle,
        });

        saveToLocalStorage(EmbeddedKey, key.privateKey);
        saveToSession<IGlobalAccountSession>(GlobalAccountSession, {
          organization: {
            ...organization,
            walletAddress,
            smartContractAddress,
          },
          session: {
            token: credentialBundle,
            expiry: nowInSeconds + halfHour,
            authenticator: AuthClient.Iframe,
          },
        });

        router.push('/valid-tzd');
      } catch (e) {
        Sentry.captureException(e);
        console.error('Error logging in with wallet', e);
        await signOut();
      }
    };

    const logout = async () => {
      try {
        removeFromSession(GlobalAccountSession);
        removeFromLocalStorage(EmbeddedKey);
        await turnkeyClient.logoutUser();
        await signOut({ callbackUrl: '/sign-in' });
      } catch (e) {
        Sentry.captureException(e);
        console.error('Error logging out', e);
      }
    };

    const checkSessionIsValid = (): boolean => {
      const currentSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      if (!currentSession) return false;
      if (
        !currentSession.session.token &&
        currentSession.session.authenticator === AuthClient.Iframe
      )
        return false;

      const nowInSeconds = Date.now() / 1000;
      return currentSession.session.expiry > nowInSeconds;
    };

    const checkValidateAuth =
      useCallback(async (): Promise<IGlobalAccountSession | null> => {
        const currentSession =
          getFromSession<IGlobalAccountSession>(GlobalAccountSession);
        if (!currentSession) {
          logout();
          return null;
        }

        const sessionValid = checkSessionIsValid();
        const currentAuthenticator = currentSession.session.authenticator;

        if (currentAuthenticator === AuthClient.Passkey) {
          if (sessionValid) return currentSession;
          await logout();
          return null;
        }

        if (currentAuthenticator === AuthClient.Iframe) {
          if (isEmpty(currentSession.session.token)) {
            await requestOtpLogin(currentSession.organization.email);
            return null;
          }

          if (sessionValid) return currentSession;
          await logout();
          return null;
        }

        return new Promise((resolve) => {
          setResolvers((prev) => [...prev, resolve]);
        });
      }, []);

    useEffect(() => {
      if (!role) return;
      if (isCollaborator(role)) {
        setHasSession(true);
        return;
      }
      const stored = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      if (!stored) return;
      const token = stored.session.token;
      if (token) {
        setHasSession(true);
        return;
      }
      setShouldRedirect(false);
      void requestOtpLogin(stored.organization.email);
    }, [role]);

    // Render the wrapped component with any additional props
    return (
      <GlobalAccountAuthContext.Provider
        value={{
          hasSession,
          checkAuthenticated: checkValidateAuth,
          requestOtpLogin,
          completeOtpLogin,
          loginWithPasskey,
          logout,
        }}
      >
        <AccountInformationContext.Provider
          value={{ showAccountInformation, setShowAccountInformation }}
        >
          <WrappedComponent {...props} />
          <AccountInformationModal />
        </AccountInformationContext.Provider>
        <OtpLoginModal isOpen={otpModalOpen} setIsOpen={setOtpModalOpen} />
      </GlobalAccountAuthContext.Provider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withGlobalAccounts(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withGlobalAccounts;
