'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  SignUpWith,
  BuildForForm,
  CompanyInfoForm,
} from '@/app/sign-up/components';
import { completeUserData } from './actions';
import { IUser } from '@/types/user';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useNotification } from '@/hooks';
import { withNotifications } from '@/hoc';

import './page.css';

const signUpFlows = {
  'sign-up-with': {
    Component: SignUpWith,
    title: 'Get started building',
    order: 0,
  },
  'build-for': {
    Component: BuildForForm,
    title: 'What are you building?',
    order: 1,
  },
  'company-information': {
    Component: CompanyInfoForm,
    title: 'Our last question',
    order: 2,
  },
};

export const SignUp = () => {
  useErrorHandler();
  const { setNotification } = useNotification();
  const searchParams = useSearchParams();
  const currentFlow = searchParams.get('flow') ?? 'sign-up-with';
  const [flow, setFlow] = useState(currentFlow);
  const [userData, setUserData] = useState<Partial<IUser>>({});

  const { Component: SignUpFlow, title } =
    signUpFlows[flow as keyof typeof signUpFlows] ?? signUpFlows['build-for'];

  const handleCompleteUserData = async (user: Partial<IUser>) => {
    try {
      await completeUserData(user);
      window.location.replace('/sign-up');
    } catch (error) {
      console.error(
        'Something went wrong while the completing user information',
        error
      );
      setNotification('Something went wrong', 'Oops...', 'error');
    }
  };

  const handleNext = (actualFlow: string, newUserData: Partial<IUser>) => {
    setUserData({ ...userData, ...newUserData });
    const currentProcess = signUpFlows[actualFlow as keyof typeof signUpFlows];
    const processes = Object.keys(signUpFlows).reduce(
      (acc, elm) => ({
        ...acc,
        [signUpFlows[elm as keyof typeof signUpFlows].order]: elm,
      }),
      {}
    );
    const nextProcess =
      processes[(currentProcess.order + 1) as keyof typeof processes] ??
      'complete';
    if (nextProcess !== 'complete') setFlow(nextProcess);
    else handleCompleteUserData({ ...userData, ...newUserData });
  };

  return (
    <main className="sign-up">
      <div className="sign-up__content">
        <article className="sign-up__form">
          <section className="sign-up__header">
            <img
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              className="w-44 h-6"
            />
            <p>{title}</p>
          </section>
          {SignUpFlow && <SignUpFlow onNext={handleNext} />}
        </article>
      </div>
    </main>
  );
};

export default withNotifications(SignUp);
