'use client';

import React, { ComponentType, useContext, useState } from 'react';
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
import { OtpLoginModal } from '@/components/OtpLoginModal/OtpLoginModal';
import { useTurnkey } from '@turnkey/sdk-react';
import { AxiosError } from 'axios';
import { NotificationContext } from '@/context/notificationContext';

export const withGlobalAccounts = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const { setNotification } = useContext(NotificationContext);
    const [otpId, setOtpId] = useState<string>('');
    const { authIframeClient } = useTurnkey();
    const [otpModalOpen, setOtpModalOpen] = useState<boolean>(false);
    const router = useRouter();
    const { showAccountInformation, setShowAccountInformation } = useAccountInformation();

    const requestOtpLogin = async (email: string) => {
      const stored = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      if (stored && stored.session.expiry > Date.now() / 1000) {
        router.push('/valid-tzd');
        return;
      }
      if (otpId) return;
      const { otpId: currentOtpId } = await initOtpLogin(email);
      setOtpId(currentOtpId);
      setOtpModalOpen(true);
    };

    const completeOtpLogin = async ({ otp, email }: { otp: string; email: string }) => {
      try {
        const organization = await getUserSubOrganization(email);
        const { credentialBundle } = await otpLogin({
          email: email,
          otpId: otpId,
          otpCode: otp,
          key: authIframeClient!.iframePublicKey!,
        });

        if (isEmpty(credentialBundle)) return;

        const valid = await authIframeClient!.injectCredentialBundle(credentialBundle);

        if (!valid) return;

        const signInResponse = await authIframeClient!.login();

        saveToSession<IGlobalAccountSession>(GlobalAccountSession, {
          organization: organization,
          session: {
            token: signInResponse!.session!,
            expiry: Number(signInResponse!.sessionExpiry!),
            authenticator: AuthClient.Iframe,
          },
        });
        setOtpModalOpen(false);
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
    };

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
            expiry: Number(signInResponse.sessionExpiry),
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

    // Render the wrapped component with any additional props
    return (
      <GlobalAccountAuthContext.Provider
        value={{
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
