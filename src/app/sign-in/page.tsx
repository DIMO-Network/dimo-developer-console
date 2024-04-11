'use client';
import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { SignInButton } from '@/components/SignInButton';
import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import BuildOnDIMO from '@/assets/images/build-on-dimo.png';

import './page.css';

export default function SignIn() {
  const handlerGitHubLogin = () => {
    console.log('test');
    window.location.href =
      'http://localhost:3000/api/auth/authorize?app=github';
  };

  return (
    <main className="sign-in">
      <div className="sign-in__content">
        <article className="sign-in__form">
          <section className="sign-in__header">
            <Image src={BuildOnDIMO} alt="DIMO Logo" className="w-44 h-6" />
            <p>Welcome back!</p>
          </section>
          <section className="sign-in__buttons">
            <SignInButton
              className="sm"
              isSignIn={true}
              Icon={GoogleIcon}
              onClick={() => {}}
            />
            <SignInButton
              className="sm"
              isSignIn={true}
              Icon={GitHubIcon}
              onClick={handlerGitHubLogin}
            />
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
}
