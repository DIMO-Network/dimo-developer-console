'use client';
import { useContext, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setCookie } from 'cookies-next/client';

import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { IAuth } from '@/types/auth';
import { isCollaborator } from '@/utils/user';
import { SignInButtons } from '@/components/SignInButton';
import { useErrorHandler, useGlobalAccount, usePasskey } from '@/hooks';
import { withNotifications } from '@/hoc';
import { NotificationContext } from '@/context/notificationContext';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountAuthContext';

import './View.css';
import * as Sentry from '@sentry/nextjs';

export const View = () => {
  useErrorHandler();
  const { setNotification } = useContext(NotificationContext);
  const { loginWithPasskey, requestOtpLogin } = useContext(GlobalAccountAuthContext);
  const { getUserGlobalAccountInfo } = useGlobalAccount();
  const { isPasskeyAvailable } = usePasskey();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationCode = searchParams.get('code') ?? '';
  if (invitationCode) {
    setCookie('invitation_code', invitationCode, {
      maxAge: 60 * 60,
    });
  }

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    await signIn(app, auth);
  };

  const handleLogin = async (email: string) => {
    try {
      const { hasPasskey } = await getUserGlobalAccountInfo(email);
      if (hasPasskey && isPasskeyAvailable) {
        await loginWithPasskey(email);
      } else {
        await requestOtpLogin(email);
      }
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Something went wrong please try again', 'Oops', 'error');
    }
  };

  useEffect(() => {
    if (!session) return;
    if (isCollaborator(session.user.role)) {
      router.push('/app');
    } else {
      void handleLogin(session.user.email!);
    }
  }, [session]);

  return (
    <main className="sign-in">
      <div className="sign-in__content">
        <article className="sign-in__form">
          <section className="sign-in__header">
            <Image
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              width={176}
              height={24}
            />
            <p>Welcome back!</p>
          </section>
          <section className="sign-in__buttons">
            <SignInButtons isSignIn={true} disabled={false} onCTA={handleCTA} />
          </section>
          <section className="sign-in__extra-links">
            <div>
              <p className="terms-caption">
                Having trouble logging in?{' '}
                <Anchor
                  href="mailto:developer-support@dimo.org"
                  className="grey underline"
                >
                  Contact our support team
                </Anchor>
              </p>
            </div>
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
          </section>
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);
