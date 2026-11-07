'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Anchor } from '@/components/Anchor';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useMixPanel } from '@/hooks/useMixPanel';
import { usePasskeyAvailability } from '@/hooks/usePasskeyAvailability';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { OtpInputForm, PasskeyLogin, SignInMethodForm } from '@/app/sign-in/components';
import { getUserInformation } from '@/actions/user';
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
  const t = useTranslations('sign-in');
  useErrorHandler();
  const { setUser, completeExternalAuth } = useAuth();
  const { trackEvent } = useMixPanel();
  const { isPasskeyAvailable } = usePasskeyAvailability();
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

      if (!existsOnGlobalAccount) {
        toast.error(t('view.walletRestoreNeeded'));
        return;
      }

      trackEvent('Sign In Attempt', {
        'type': 'Internal Auth',
        'distinct_id': email,
        'Sign In Method': 'Email',
      });

      const { subOrganizationId, hasPasskey, currentWalletAddress } = userInformation;

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
      toast.error(t('view.genericError'));
    }
  };

  const handlePasskeyRejected = (shouldFallback: boolean) => {
    setSignInProcess((signInProcess) => ({
      ...signInProcess,
      signInType: shouldFallback ? SignInType.OTP : SignInType.NONE,
    }));
  };

  const handleExternalAuth = async (code: string) => {
    try {
      const { success, email } = await completeExternalAuth(
        code,
        searchParams.get('state'),
      );
      if (!success) {
        toast.error(t('view.externalLoginFailed'));
        return;
      }

      await handleLogin(email);
    } catch (error) {
      Sentry.captureException(error);
      toast.error(t('view.externalLoginFailed'));
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
              {t.rich('view.termsAgreement', {
                terms: (chunks) => (
                  <Anchor
                    href="https://dimo.org/terms"
                    className="grey underline"
                    target="_blank"
                  >
                    {chunks}
                  </Anchor>
                ),
                privacy: (chunks) => (
                  <Anchor
                    href="https://dimo.org/privacy"
                    className="grey underline"
                    target="_blank"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default View;
