'use client';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { existUserEmailOrAddress } from '@/actions/user';
import { IAuth } from '@/types/auth';
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
            <Image
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              width={176}
              height={24}
            />
            <p> Please check for the email we've sent you.</p>
          </section>
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);
