'use client';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { SignUpWith, BuildForForm } from '@/app/sign-up/components';
import BuildOnDIMO from '@/assets/images/build-on-dimo.png';

import './page.css';

const signUpFlows = {
  'sign-up-with': {
    Component: SignUpWith,
    title: 'Get started building',
  },
  'build-for': {
    Component: BuildForForm,
    title: 'What are you building?',
  },
};

export const SignUp = () => {
  const searchParams = useSearchParams();
  const flow = searchParams.get('flow') ?? 'sign-up-with';

  const { Component: SignUpFlow, title } =
    signUpFlows[flow as keyof typeof signUpFlows] ?? {};

  return (
    <main className="sign-up">
      <div className="sign-up__content">
        <article className="sign-up__form">
          <section className="sign-up__header">
            <Image src={BuildOnDIMO} alt="DIMO Logo" className="w-44 h-6" />
            <p>{title}</p>
          </section>
          {SignUpFlow && <SignUpFlow />}
        </article>
      </div>
    </main>
  );
};

export default SignUp;
