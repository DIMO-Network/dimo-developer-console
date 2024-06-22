'use client';
import { signIn } from 'next-auth/react';

import { Anchor } from '@/components/Anchor';
import { existUserAddress } from '@/actions/user';
import { IAuth } from '@/types/auth';
import { SignInButtons } from '@/components/SignInButton';
import { useErrorHandler, useNotification } from '@/hooks';
import { withNotifications } from '@/hoc';

import './View.css';

export const View = () => {
  useErrorHandler();
  const { setNotification } = useNotification();

  const notifyUnregisterUser = (type: string) => {
    setNotification(`The ${type} is not registered`, 'Not registered', 'error');
  };

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    if (app === 'credentials') {
      const { exist } = await existUserAddress(auth?.address ?? null);

      if (!exist) {
        notifyUnregisterUser('address');
        return;
      }
    }
    signIn(app, auth);
  };

  return (
    <main className="sign-in">
      <div className="sign-in__content">
        <article className="sign-in__form">
          <section className="sign-in__header">
            <img
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              className="w-44 h-6"
            />
            <p>Welcome back!</p>
          </section>
          <section className="sign-in__buttons">
            <SignInButtons isSignIn={true} disabled={false} onCTA={handleCTA} />
          </section>
          <section className="sign-in__extra-links">
            <Anchor href="/sign-up" className="primary">
              Create an account
            </Anchor>
          </section>
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);
