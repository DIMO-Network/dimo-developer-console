import React from 'react';
import clsx from 'classnames';
import { CheckIcon } from '@/components/Icons';
import { useWebhookCreateFormContext } from '@/hoc';

export const FormStepTracker = () => {
  const { steps, stepIndex } = useWebhookCreateFormContext();
  return (
    <div className={'flex flex-col gap-4 p-4 bg-card rounded-card'}>
      <ol className={'list-decimal space-y-4'}>
        {steps.map((step, index) => (
          <FormStepTrackerRow
            key={index}
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
  title,
  isActive,
  isComplete,
}: {
  title: string;
  isActive: boolean;
  isComplete: boolean;
}) => {
  return (
    <li
      className={clsx(
        'list-item list-decimal list-inside',
        isComplete ? 'text-positive' : isActive ? 'text-ink' : 'text-muted',
      )}
    >
      <div className={'flex flex-row gap-2 items-center'}>
        {isComplete ? (
          <div>
            <CheckIcon />
          </div>
        ) : (
          <div
            className={clsx(
              'w-4 h-4 bg-transparent border rounded-full',
              isActive ? 'border-ink' : 'border-muted',
            )}
          />
        )}
        <p>{title}</p>
      </div>
    </li>
  );
};
