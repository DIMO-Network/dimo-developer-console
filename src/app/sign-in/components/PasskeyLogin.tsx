'use client';

import { Anchor } from '@/components/Anchor';
import { BubbleLoader } from '@/components/BubbleLoader';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FC, useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { explainSignUpRefusal } from '@/app/sign-up/signUpResult';

interface IProps {
  handlePasskeyRejected: (shouldFallback: boolean) => void;
  currentWallet: `0x${string}` | null;
}

export const PasskeyLogin: FC<IProps> = ({ handlePasskeyRejected, currentWallet }) => {
  const t = useTranslations('sign-in');
  const tSignUp = useTranslations('sign-up');
  const router = useRouter();
  const { loginWithPasskey } = useAuth();

  const handleLoginWithPasskey = async () => {
    try {
      const { success } = await loginWithPasskey({
        currentWalletValue: currentWallet,
        existOnDevConsole: true,
      });

      if (!success) {
        toast.error(t('passkey.loginFailed'));
        return;
      }

      router.replace('/app');
    } catch (error: unknown) {
      if (explainSignUpRefusal(error, () => router.replace('/sign-in'), tSignUp)) {
        handlePasskeyRejected(false);
        return;
      }
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          handlePasskeyRejected(true);
          return;
        }
      }
      handlePasskeyRejected(false);
      captureException(error);
      toast.error(t('passkey.loginFailed'));
    }
  };

  useEffect(() => {
    void handleLoginWithPasskey();
  }, []);
  return (
    <>
      <div className="sign-in__form">
        <div className="sign-in__header">
          <p className="text-title text-ink">{t('passkey.title')}</p>
        </div>
        <BubbleLoader isLoading={true} />
        <div className="sign-in__extra-links">
          <div className="flex flex-row">
            <p className="terms-caption">
              {/* Rarely used: not worth a prefetch while sign-in loads. */}
              {t.rich('passkey.lostPasskey', {
                recover: (chunks) => (
                  <Anchor
                    href="/email-recovery"
                    prefetch={false}
                    target="_self"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
          <div className="flex flex-row">
            <p className="terms-caption">
              {t.rich('passkey.troubleLoggingIn', {
                support: (chunks) => (
                  <Anchor
                    href="mailto:developer-support@dimo.org"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
