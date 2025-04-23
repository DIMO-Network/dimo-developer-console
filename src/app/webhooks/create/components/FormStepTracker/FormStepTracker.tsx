import React from 'react';
import clsx from 'classnames';
import { CheckIcon } from '@/components/Icons';

export const FormStepTracker = ({ curStep }: { curStep: number }) => {
  return (
    <div className={'flex flex-col gap-4 p-4 bg-surface-default rounded-2xl'}>
      <ol className={'list-decimal space-y-4'}>
        <FormStepTrackerRow text={'Configure'} stepIndex={0} currentStep={curStep} />
        <FormStepTrackerRow
          text={'Specify delivery'}
          stepIndex={1}
          currentStep={curStep}
        />
        <FormStepTrackerRow
          text={'Specify vehicles'}
          stepIndex={2}
          currentStep={curStep}
        />
      </ol>
    </div>
  );
};
const FormStepTrackerRow = (props: {
  text: string;
  stepIndex: number;
  currentStep: number;
}) => {
  const isComplete = props.currentStep > props.stepIndex;
  const isActive = props.currentStep === props.stepIndex;
  return (
    <li
      className={clsx(
        'list-item list-decimal list-inside',
        isActive ? 'text-white' : 'text-text-secondary',
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
              isActive ? 'border-white' : 'border-text-secondary',
            )}
          />
        )}
        <p>{props.text}</p>
      </div>
    </li>
  );
};
