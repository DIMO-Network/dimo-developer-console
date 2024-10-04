'use client';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { IAuth } from '@/types/auth';
import { SignInButtons } from '@/components/SignInButton';
import { useErrorHandler } from '@/hooks';
import { withNotifications } from '@/hoc';

import './View.css';
import { useEffect } from 'react';
import { useGlobalAccount } from '@/hooks';

export const View = () => {
  useErrorHandler();
  const { organizationInfo, walletLogin } = useGlobalAccount();

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    await signIn(app, auth);
  };

  useEffect(() => {
    if (!organizationInfo) return;
    void walletLogin();
  }, [organizationInfo]);

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
