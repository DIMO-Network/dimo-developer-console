'use client';
import { withNotifications } from '@/hoc';
import './View.css';
import { useErrorHandler } from '@/hooks';
import {
  CheckEmail,
  EmailRecoveryForm,
  RewirePasskey,
} from '@/app/email-recovery/components';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { IPasskeyRecoveryState } from '@/types/auth';

const emailRecoveryFlows = {
  'email-form': {
    Component: EmailRecoveryForm,
    title: 'Enter your email',
    order: 1,
  },
  'check-email': {
    Component: CheckEmail,
    title: 'Click the link in your email',
    order: 2,
  },
  'rewire-passkey': {
    Component: RewirePasskey,
    title: "Let's get you back in",
    order: 3,
  },
};

export const View = () => {
  useErrorHandler();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentState, setCurrentState] = useState<Partial<IPasskeyRecoveryState>>({});
  const currentFlow = searchParams.get('flow') ?? 'email-form';
  const [flow, setFlow] = useState(currentFlow);
  const { Component: EmailRecoveryFlow } =
    emailRecoveryFlows[flow as keyof typeof emailRecoveryFlows] ??
    emailRecoveryFlows['email-form'];

  const handleNext = (actualFlow: string, state?: Partial<IPasskeyRecoveryState>) => {
    setCurrentState({
      ...currentState,
      ...state,
    });
    const currentProcess =
      emailRecoveryFlows[actualFlow as keyof typeof emailRecoveryFlows];
    const processes = Object.keys(emailRecoveryFlows).reduce(
      (acc, elm) => ({
        ...acc,
        [emailRecoveryFlows[elm as keyof typeof emailRecoveryFlows].order]: elm,
      }),
      {},
    );

    const nextProcess =
      processes[(currentProcess.order + 1) as keyof typeof processes] ?? 'complete';
    if (nextProcess !== 'complete') setFlow(nextProcess);
    else router.replace('/sign-in');
  };

  return (
    <div className="email-recovery">
      <div className="email-recovery__content">
        {EmailRecoveryFlow && (
          <EmailRecoveryFlow onNext={handleNext} state={currentState} />
        )}
      </div>
    </div>
  );
};

export default withNotifications(View);
