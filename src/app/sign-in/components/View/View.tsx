'use client';

import { Anchor } from '@/components/Anchor';
import { SignInButtons } from '@/components/SignInButton';
import { useErrorHandler } from '@/hooks';
import { withNotifications } from '@/hoc';

import './View.css';

export const View = () => {
  useErrorHandler();

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
            <SignInButtons isSignIn={true} disabled={false} />
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
