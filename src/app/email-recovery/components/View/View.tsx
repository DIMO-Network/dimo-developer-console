"use client";
import { withNotifications } from '@/hoc';
import "./View.css";
import { useErrorHandler } from '@/hooks';
import Image from 'next/image';
import { CheckEmail, EmailRecoveryForm } from '@/app/email-recovery/components';
import title from '@/components/Title/Title';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const emailRecoveryFlows = {
  'email-form': {
    Component: EmailRecoveryForm,
    title: 'Enter your email',
    order: 1,
  },
  'check-email': {
    Component: CheckEmail,
    title: 'Check your email',
    order: 2,
  },
};

export const View = () => {
  useErrorHandler();
  const searchParams = useSearchParams();
  const currentFlow = searchParams.get('flow') ?? 'email-form';
  const [flow, setFlow] = useState(currentFlow);
  const { Component: EmailRecoveryFlow, title } = emailRecoveryFlows[flow as keyof typeof emailRecoveryFlows] ?? emailRecoveryFlows['email-form'];

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
          {EmailRecoveryFlow && <EmailRecoveryFlow />}
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);