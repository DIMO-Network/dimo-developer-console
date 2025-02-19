'use client';

import React, {
  ComponentType,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { useAccountInformation } from '@/hooks';
import { AccountInformationModal } from '@/components/AccountInformationModal';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountAuthContext';
import { otpLogin, initOtpLogin, getUserSubOrganization } from '@/services/globalAccount';
import { AuthClient } from '@turnkey/sdk-browser';
import { useRouter } from 'next/navigation';
import { passkeyClient, turnkeyClient } from '@/config/turnkey';
import * as Sentry from '@sentry/nextjs';
import { signOut } from 'next-auth/react';
import { isEmpty } from 'lodash';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  saveToSession,
  removeFromSession,
  GlobalAccountSession,
  getFromSession,
} from '@/utils/sessionStorage';
import { OtpLoginModal } from '@/components/OtpLoginModal';
import { useTurnkey } from '@turnkey/sdk-react';
import { AxiosError } from 'axios';
import { NotificationContext } from '@/context/notificationContext';

const halfHour = 30 * 60;
const fifteenMinutes = 15 * 60;
export const withGlobalAccounts = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const router = useRouter();
    const { authIframeClient } = useTurnkey();
    const [currentSession, setCurrentSession] = useState<IGlobalAccountSession | null>(
      null,
    );
    const { setNotification } = useContext(NotificationContext);
    const [otpId, setOtpId] = useState<string>('');
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
        if (otpId) return;
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
          const { credentialBundle } = await otpLogin({
            email: email,
            otpId: otpId,
            otpCode: otp,
            key: authIframeClient!.iframePublicKey!,
          });

          if (isEmpty(credentialBundle)) return;

          const injected = await authIframeClient!.injectCredentialBundle(credentialBundle);

          if (!injected) return;

          const currentSession = {
            organization: organization,
            session: {
              token: credentialBundle,
              expiry: Date.now() / 1000 + fifteenMinutes,
              authenticator: AuthClient.Iframe,
            },
          };

          saveToSession<IGlobalAccountSession>(GlobalAccountSession, currentSession);
          setCurrentSession(currentSession);
          setOtpModalOpen(false);
          setResolvers((prev) => {
            prev.forEach((resolve) => resolve(currentSession));
            return [];
          });
          router.push('/valid-tzd');
        } catch (e: unknown) {
          Sentry.captureException(e);
          if (e instanceof AxiosError) {
            setNotification(e.response?.data.error, 'Error', 'error');
            return;
          }
          console.error('Error logging in with otp', e);
          await signOut();
        }
      },
      [authIframeClient, otpId],
    );

    const loginWithPasskey = async (email: string) => {
      try {
        const stored = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
        if (stored && stored.session.expiry > Date.now() / 1000) {
          router.push('/valid-tzd');
          return;
        }
        const organization = await getUserSubOrganization(email);
        // a bit hacky but works for now
        const signInResponse = await passkeyClient.login({
          organizationId: organization.subOrganizationId,
        });

        if (isEmpty(signInResponse.organizationId)) return;

        saveToSession<IGlobalAccountSession>(GlobalAccountSession, {
          organization: organization,
          session: {
            token: signInResponse.session,
            expiry: Date.now() / 1000 + halfHour,
            authenticator: AuthClient.Passkey,
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
        await turnkeyClient.logoutUser();
        await signOut({ callbackUrl: '/sign-in' });
      } catch (e) {
        Sentry.captureException(e);
        console.error('Error logging out', e);
      }
    };

    const checkSessionIsValid = (): boolean => {
      if (!currentSession) return false;
      if (
        !currentSession.session.token &&
        currentSession.session.authenticator === AuthClient.Iframe
      )
        return false;
      return currentSession.session.expiry > Date.now() / 1000;
    };

    const checkValidateAuth =
      useCallback(async (): Promise<IGlobalAccountSession | null> => {
        if (!currentSession) {
          logout();
          return null;
        }

        const sessionValid = checkSessionIsValid();
        const currentAuthenticator = currentSession.session.authenticator;

        if (currentAuthenticator === AuthClient.Passkey && !sessionValid) {
          await logout();
          return null;
        }
        if (currentAuthenticator === AuthClient.Iframe) {
          if (isEmpty(currentSession.session.token)) {
            await requestOtpLogin(currentSession.organization.email);
            return currentSession;
          }

          const injected = await authIframeClient!.injectCredentialBundle(
            currentSession.session.token,
          );
          if (injected && sessionValid) return currentSession;
          await logout();
          return null;
        }

        return new Promise((resolve) => {
          setResolvers((prev) => [...prev, resolve]);
        });
      }, [currentSession, authIframeClient]);

    useEffect(() => {
      const stored = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      if (stored && stored.session.expiry > Date.now() / 1000) {
        setCurrentSession(stored);
      } else {
        setCurrentSession(null);
      }
    }, []);

    // Render the wrapped component with any additional props
    return (
      <GlobalAccountAuthContext.Provider
        value={{
          globalAccountSession: currentSession,
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
