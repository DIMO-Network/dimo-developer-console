import React, { FC, ReactNode } from 'react';
import { PlusCircleIcon } from '@heroicons/react/16/solid';
import { ActionCompletedRow } from '@/components/OnboardingBanner/components/ActionCompletedRow';

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
    <div className={'flex flex-col md:flex-row justify-between w-full'}>
      <div className={'flex flex-row gap-2 items-center'}>
        <PlusCircleIcon className="size-4 text-white" />
        <div>
          <p className={'text-base text-white'}>{text}</p>
          {!!subtitle && <p className={'text-sm text-text-secondary'}>{subtitle}</p>}
        </div>
      </div>
      <div className={'mt-4 md:mt-0'}>{CTA}</div>
    </div>
  );
};
