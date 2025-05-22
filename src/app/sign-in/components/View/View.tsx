'use client';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anchor } from '@/components/Anchor';
import { useAuth, useErrorHandler, useMixPanel, usePasskey } from '@/hooks';
import { withNotifications } from '@/hoc';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';
import { OtpInputForm, PasskeyLogin, SignInMethodForm } from '@/app/sign-in/components';
import { getUserInformation } from '@/actions/user';
import { isCollaborator } from '@/utils/user';
import { isEmpty, isNull } from 'lodash';

import './View.css';

enum SignInType {
  NONE = 'none',
  OTP = 'otp',
  PASSKEY = 'passkey',
}

const SignInForm = ({
  type,
  handleLogin,
  handlePasskeyRejected,
  currentEmail,
  currentWallet,
}: {
  type: SignInType;
  handleLogin: (email: string) => Promise<void>;
  handlePasskeyRejected: (shouldFallback: boolean) => void;
  currentEmail: string;
  currentWallet: `0x${string}` | null;
}): ReactNode => {
  switch (type) {
    case SignInType.OTP:
      return <OtpInputForm currentEmail={currentEmail} currentWallet={currentWallet} />;
    case SignInType.PASSKEY:
      return (
        <PasskeyLogin
          handlePasskeyRejected={handlePasskeyRejected}
          currentWallet={currentWallet}
        />
      );
    default:
      return <SignInMethodForm handleLogin={handleLogin} />;
  }
};

export const View = () => {
  useErrorHandler();
  const { setNotification } = useContext(NotificationContext);
  const { setUser, completeExternalAuth } = useAuth();
  const { trackEvent } = useMixPanel();
  const { isPasskeyAvailable } = usePasskey();
  const searchParams = useSearchParams();
  const router = useRouter();
  const authCode = searchParams.get('code') ?? '';

  const [signInProcess, setSignInProcess] = useState<{
    email: string;
    signInType: SignInType;
    currentWallet: `0x${string}` | null;
  }>({
    email: '',
    signInType: SignInType.NONE,
    currentWallet: null,
  });

  const handleLogin = async (email: string) => {
    try {
      const userInformation = await getUserInformation(email);

      if (!userInformation) {
        router.push(`/sign-up?email=${encodeURIComponent(email)}`);
        return;
      }

      const { existsOnDevConsole, existsOnGlobalAccount } = userInformation;

      if (!existsOnDevConsole && existsOnGlobalAccount) {
        router.push(`/sign-up?email=${encodeURIComponent(email)}&hasGlobalAccount=true`);
        return;
      }

      trackEvent('Sign In Attempt', {
        'type': 'Internal Auth',
        'distinct_id': email,
        'Sign In Method': 'Email',
      });

      const { role, subOrganizationId, hasPasskey, currentWalletAddress } =
        userInformation;

      if (isCollaborator(role)) {
        router.replace('/app');
        return;
      }

      setUser({
        subOrganizationId: subOrganizationId,
        email: email,
      });

      if (hasPasskey && isPasskeyAvailable) {
        setSignInProcess({
          email: email,
          signInType: SignInType.PASSKEY,
          currentWallet: currentWalletAddress,
        });
      } else {
        setSignInProcess({
          email: email,
          signInType: SignInType.OTP,
          currentWallet: currentWalletAddress,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Something went wrong please try again', 'Oops', 'error');
    }
  };

  const handlePasskeyRejected = (shouldFallback: boolean) => {
    setSignInProcess((signInProcess) => ({
      ...signInProcess,
      signInType: shouldFallback ? SignInType.OTP : SignInType.NONE,
    }));
  };

  const handleExternalAuth = async (provider: string) => {
    try {
      const { success, email } = await completeExternalAuth(provider);
      if (!success) {
        setNotification('Failed to login with external provider', 'Oops...', 'error');
        return;
      }

      await handleLogin(email);
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Failed to login with external provider', 'Oops...', 'error');
    }
  };

  useEffect(() => {
    if (!router) return;
    router.prefetch('/app');
  }, [router]);

  useEffect(() => {
    if (isNull(isPasskeyAvailable)) return;
    if (isEmpty(authCode)) return;
    void handleExternalAuth(authCode);
  }, [authCode, isPasskeyAvailable]);

  return (
    <div className="sign-in">
      <div className="sign-in__content">
        <SignInForm
          currentEmail={signInProcess.email}
          type={signInProcess.signInType}
          handleLogin={handleLogin}
          handlePasskeyRejected={handlePasskeyRejected}
          currentWallet={signInProcess.currentWallet}
        />
        <div className="sign-in__extra-links mt-6">
          <div className="flex flex-row">
            <p className="terms-caption">
              By signing in, you are agreeing to our{' '}
              <Anchor
                href="https://docs.dimo.zone/dinc/developer-terms-of-service"
                className="grey underline"
                target="_blank"
              >
                terms of service
              </Anchor>{' '}
              and{' '}
              <Anchor
                href="https://dimo.zone/legal/privacy-policy"
                className="grey underline"
                target="_blank"
              >
                privacy policy
              </Anchor>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withNotifications(View);
