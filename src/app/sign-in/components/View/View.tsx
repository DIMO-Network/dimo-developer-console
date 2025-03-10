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
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';

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
        <Image
          src={'/images/build-on-dimo.png'}
          alt="DIMO Logo"
          width={176}
          height={24}
        />
        <article className="sign-in__form">
          <section className="sign-in__header">            
            <p>Build with car data</p>
          </section>
          <section className="sign-in__input">
            <TextField />
            <Button disabled={true} onClick={() => {}}>
              Continue
            </Button>
          </section>
          <section className="sign-in__divider">
            <div className="divider"></div>
            <p className='divider-caption' >or</p>          
            <div className="divider"></div>
          </section>
          <section className="sign-in__buttons">
            <SignInButtons isSignIn={true} disabled={false} onCTA={handleCTA} />
          </section>
          <section className="sign-in__extra-links">
            <div className="flex flex-row">
              <p className="terms-caption">
                Lost your passkey?{' '}
                <Anchor href="/email-recovery" target="_self" className="grey underline">
                  Recover with your email
                </Anchor>
              </p>
            </div>
            <div className="flex flex-row">
              <p className="terms-caption">
                Trouble logging in?{' '}
                <Anchor
                  href="mailto:developer-support@dimo.org"
                  className="grey underline"
                >
                  Get support
                </Anchor>
              </p>
            </div>
          </section>
        </article>
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
      <div className="sign-in__background">
        <img src={'/images/car_segment.svg'} alt="DIMO Background" />
      </div>
    </main>
  );
};

export default withNotifications(View);
