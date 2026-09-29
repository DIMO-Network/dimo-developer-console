import React from 'react';
import clsx from 'classnames';
import { CheckIcon } from '@/components/Icons';
import { useWebhookCreateFormContext } from '@/hoc';

export const FormStepTracker = () => {
  const { steps, stepIndex } = useWebhookCreateFormContext();
  return (
    <div className={'flex flex-col gap-4 p-4 bg-card rounded-card'}>
      <ol className={'space-y-4'}>
        {steps.map((step, index) => (
          <FormStepTrackerRow
            key={index}
            index={index}
            isActive={stepIndex === index}
            isComplete={index < stepIndex}
            title={step.getTitle()}
          />
        ))}
      </ol>
    </div>
  );
};

const FormStepTrackerRow = ({
  index,
  title,
  isActive,
  isComplete,
}: {
  index: number;
  title: string;
  isActive: boolean;
  isComplete: boolean;
}) => {
  return (
    <li
      aria-current={isActive ? 'step' : undefined}
      className={clsx(
        'flex flex-row items-center gap-2 text-body-sm',
        isActive ? 'font-semibold text-ink' : isComplete ? 'text-fg' : 'text-muted',
      )}
    >
      {isComplete ? (
        <div className={'flex h-5 w-5 flex-shrink-0 items-center justify-center'}>
          <CheckIcon />
        </div>
      ) : (
        <div
          className={clsx(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-label',
            isActive
              ? 'bg-selected-bg text-selected-fg'
              : 'border border-control-border text-muted',
          )}
        >
          {index + 1}
        </div>
      )}
      <p>{title}</p>
    </li>
  );
};
