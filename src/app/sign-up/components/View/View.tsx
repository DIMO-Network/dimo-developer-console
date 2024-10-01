'use client';
import { useContext, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { BuildForForm, CompanyInfoForm, WalletCreation } from '@/app/sign-up/components';
import { completeUserData } from '@/app/sign-up/actions';
import { IAuth } from '@/types/auth';
import { NotificationContext } from '@/context/notificationContext';
import { useErrorHandler } from '@/hooks';
import { withNotifications } from '@/hoc';

import './View.css';
import { getUser } from '@/actions/user';

const signUpFlows = {
  'wallet-creation': {
    Component: WalletCreation,
    title: "Let's get you a wallet",
    order: 1,
  },
  'build-for': {
    Component: BuildForForm,
    title: 'What are you building?',
    order: 2,
  },
  'company-information': {
    Component: CompanyInfoForm,
    title: 'Our last question',
    order: 3,
  },
};

const View = () => {
  useErrorHandler();
  const { setNotification } = useContext(NotificationContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFlow = searchParams.get('flow') ?? 'wallet-creation';
  const [flow, setFlow] = useState(currentFlow);
  const [authData, setAuthData] = useState<Partial<IAuth>>({});

  const { Component: SignUpFlow, title } =
    signUpFlows[flow as keyof typeof signUpFlows] ??
    signUpFlows['wallet-creation'];

  const handleCompleteUserData = async (auth: Partial<IAuth>) => {
    try {
      await completeUserData(auth);
      router.replace('/app');
    } catch (error) {
      console.error(
        'Something went wrong while the completing user information',
        error,
      );
      setNotification('Something went wrong', 'Oops...', 'error');
    }
  };

  const handleNext = async (actualFlow: string, inputAuth?: Partial<IAuth>) => {
    // Check if user already has a team, if so, redirect to app cause is an old user
    const user = await getUser();
    if (user?.team) {
      router.replace('/app');
      return;
    }

    const newUserData = {
      ...authData,
      ...inputAuth,
      company: {
        ...authData.company,
        ...(inputAuth?.company ?? {}),
      },
    } as Partial<IAuth>;
    setAuthData(newUserData);
    const currentProcess = signUpFlows[actualFlow as keyof typeof signUpFlows];
    const processes = Object.keys(signUpFlows).reduce(
      (acc, elm) => ({
        ...acc,
        [signUpFlows[elm as keyof typeof signUpFlows].order]: elm,
      }),
      {},
    );
    const nextProcess =
      processes[(currentProcess.order + 1) as keyof typeof processes] ??
      'complete';
    if (nextProcess !== 'complete') setFlow(nextProcess);
    else handleCompleteUserData(newUserData);
  };

  return (
    <main className="sign-up">
      <div className="sign-up__content">
        <article className="sign-up__form">
          <section className="sign-up__header">
            <Image
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              width={176}
              height={24}
            />
            <p>{title}</p>
          </section>
          {SignUpFlow && <SignUpFlow onNext={handleNext} auth={authData} />}
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);
