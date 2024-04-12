'use client';
import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { SignInButtons } from '@/components/SignInButton';
import BuildOnDIMO from '@/assets/images/build-on-dimo.png';

import './page.css';

export const SignUp = () => {
  return (
    <main className="sign-up">
      <div className="sign-up__content">
        <article className="sign-up__form">
          <section className="sign-up__header">
            <Image src={BuildOnDIMO} alt="DIMO Logo" className="w-44 h-6" />
            <p>Get started building</p>
          </section>
          <section className="sign-up__buttons">
            <SignInButtons isSignIn={false} />
          </section>
          <section className="sign-up__extra-links">
            <Anchor href="/sign-in" className="primary">
              Already have an account?
            </Anchor>
            <p className="terms-caption">
              by signing up, you are agreeing to our{' '}
              <Anchor href="#" className="grey underline">
                terms of service
              </Anchor>{' '}
              and{' '}
              <Anchor href="#" className="grey underline">
                privacy policy
              </Anchor>
            </p>
          </section>
        </article>
      </div>
    </main>
  );
};

export default SignUp;
