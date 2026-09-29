import React, { FC, ReactNode } from 'react';
import { PlusCircleIcon } from '@heroicons/react/16/solid';
import { ActionCompletedRow } from '@/components/OnboardingBanner/ActionCompletedRow';

interface CTARowProps {
  text: string;
  subtitle?: string;
  CTA: ReactNode;
  isComplete: boolean;
}

export const CTARow: FC<CTARowProps> = ({ text, subtitle, CTA, isComplete }) => {
  if (isComplete) {
    return <ActionCompletedRow text={text} />;
  }
  return (
    <div
      className={'flex w-full flex-col justify-between gap-4 md:flex-row md:items-center'}
    >
      <div className={'flex flex-row items-start gap-2.5'}>
        <PlusCircleIcon className="mt-[3px] size-4 shrink-0 text-muted" />
        <div className={'flex flex-col gap-0.5'}>
          <p className={'text-body font-medium text-ink'}>{text}</p>
          {!!subtitle && <p className={'text-body-sm text-muted'}>{subtitle}</p>}
        </div>
      </div>
      <div className={'shrink-0 pl-[26px] md:pl-0'}>{CTA}</div>
    </div>
  );
};
