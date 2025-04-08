'use client';
import { useContext, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';

import { BuildForForm, CompanyInfoForm, WalletCreation } from '@/app/sign-up/components';
import { completeUserData } from '@/app/sign-up/actions';
import { IAuth } from '@/types/auth';
import { NotificationContext } from '@/context/notificationContext';
import { useErrorHandler } from '@/hooks';
import { withNotifications } from '@/hoc';
import { getUser } from '@/actions/user';
import { Anchor } from '@/components/Anchor';

import './View.css';

const signUpFlows = {
  'wallet-creation': {
    Component: WalletCreation,
    title: 'Continue with passkey',
    order: 1,
  },
  'build-for': {
    Component: BuildForForm,
    title: 'What are you building?',
    order: 2,
  },
  'company-information': {
    Component: CompanyInfoForm,
    title: 'Final strecht',
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

  const { Component: SignUpFlow } =
    signUpFlows[flow as keyof typeof signUpFlows] ?? signUpFlows['wallet-creation'];

  const handleCompleteUserData = async (auth: Partial<IAuth>) => {
    try {
      await completeUserData(auth);
      window.location.href = '/app';
    } catch (error) {
      console.error('Something went wrong while the completing user information', error);
      Sentry.captureException(error);
      setNotification('Something went wrong', 'Oops...', 'error');
    }
  };

  const handleNext = async (actualFlow: string, inputAuth?: Partial<IAuth>) => {
    // Check if user already has a team, if so, redirect to app cause is an old user
    const user = await getUser();
    if (user?.team) {
      history.replaceState({}, '', '/app');
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
      processes[(currentProcess.order + 1) as keyof typeof processes] ?? 'complete';
    if (nextProcess !== 'complete') setFlow(nextProcess);
    else await handleCompleteUserData(newUserData);
  };

  return (
    <div className="sign-up">
      <div className="sign-up__content">
        <img src={'/images/dimo-dev.svg'} alt="DIMO Logo" />
        {SignUpFlow && <SignUpFlow onNext={handleNext} auth={authData} />}
        <div className="sign-up__extra-links mt-6">
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
        </div>
      </div>
    </div>
  );
};

export default withNotifications(View);
