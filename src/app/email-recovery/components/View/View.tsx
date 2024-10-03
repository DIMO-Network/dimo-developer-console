"use client";
import { withNotifications } from '@/hoc';
import "./View.css";
import { useErrorHandler } from '@/hooks';
import Image from 'next/image';
import { CheckEmail, EmailRecoveryForm, RewirePasskey } from '@/app/email-recovery/components';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

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
  const currentFlow = searchParams.get('flow') ?? 'email-form';
  const [flow, setFlow] = useState(currentFlow);
  const { Component: EmailRecoveryFlow, title } = emailRecoveryFlows[flow as keyof typeof emailRecoveryFlows] ?? emailRecoveryFlows['email-form'];

  const handleNext = (actualFlow: string) => {
    const currentProcess = emailRecoveryFlows[actualFlow as keyof typeof emailRecoveryFlows];
    const processes = Object.keys(emailRecoveryFlows).reduce(
      (acc, elm) => ({
        ...acc,
        [emailRecoveryFlows[elm as keyof typeof emailRecoveryFlows].order]: elm,
      }),
      {},
    );

    const nextProcess = processes[(currentProcess.order + 1) as keyof typeof processes] ?? 'complete';
    if (nextProcess !== 'complete') setFlow(nextProcess);
    else router.replace('/sign-in');
  };

  return (
    <main className="email-recovery">
      <div className="email-recovery__content">
        <article className="email-recovery__form">
          <section className="email-recovery__header">
            <Image
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              width={176}
              height={24}
            />
            <p>{title}</p>
          </section>
          {EmailRecoveryFlow && <EmailRecoveryFlow onNext={handleNext} />}
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);