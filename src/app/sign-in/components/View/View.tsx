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
import { useErrorHandler } from '@/hooks';
import { useGlobalAccount } from '@/hooks';
import { withNotifications } from '@/hoc';

import './View.css';
import { NotificationContext } from '@/context/notificationContext';

export const View = () => {
  useErrorHandler();
  const { organizationInfo, walletLogin, validatePasskeyAvailability } =
    useGlobalAccount();
  const { setNotification } = useContext(NotificationContext);
  const { data: session } = useSession();
  const { role = '' } = session?.user ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationCode = searchParams.get('code') ?? '';
  if (invitationCode) {
    setCookie('invitation_code', invitationCode, {
      maxAge: 60 * 60,
    });
  }

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    const isAvailable = await validatePasskeyAvailability();
    if (!isAvailable) {
      setNotification(
        "Passkey is not available in your browser. Please be sure that you're using a Passkey ready browser.",
        'Oops...',
        'error',
      );
      return;
    }
    await signIn(app, auth);
  };

  useEffect(() => {
    if (isCollaborator(role)) {
      router.push('/app');
    } else {
      if (!organizationInfo) return;
      void walletLogin();
    }
  }, [organizationInfo, role]);

  useEffect(() => {
    validatePasskeyAvailability().then((isAvailable) => {
      if (isAvailable) return;
      setNotification(
        "Passkey is not available in your browser. Please be sure that you're using a Passkey ready browser.",
        'Oops...',
        'error',
      );
    });
  }, []);

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
                Lost your passkey?{' '}
                <Anchor
                  href="/email-recovery"
                  target="_self"
                  className="grey underline"
                >
                  Recover with your email
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
