import React from 'react';
import clsx from 'classnames';
import { CheckIcon } from '@/components/Icons';
import { WebhookFormStepName } from '@/components/Webhooks/NewWebhookForm';

const formStepConfig = {
  [WebhookFormStepName.CONFIGURE]: { text: 'Configure' },
  [WebhookFormStepName.DELIVERY]: { text: 'Specify delivery' },
  [WebhookFormStepName.SPECIFY_VEHICLES]: { text: 'Specify vehicles' },
};

export const FormStepTracker = ({
  currentStep,
  steps,
}: {
  currentStep: WebhookFormStepName;
  steps: WebhookFormStepName[];
}) => {
  return (
    <div className={'flex flex-col gap-4 p-4 bg-surface-default rounded-2xl'}>
      <ol className={'list-decimal space-y-4'}>
        {steps.map((step: WebhookFormStepName, index) => (
          <FormStepTrackerRow
            key={index}
            steps={steps}
            step={step}
            currentStep={currentStep}
          />
        ))}
      </ol>
    </div>
  );
};
const FormStepTrackerRow = ({
  step,
  steps,
  currentStep,
}: {
  step: WebhookFormStepName;
  currentStep: WebhookFormStepName;
  steps: WebhookFormStepName[];
}) => {
  const isComplete = steps.indexOf(currentStep) > steps.indexOf(step);
  const isActive = steps.indexOf(currentStep) === steps.indexOf(step);
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
        <p>{formStepConfig[step].text}</p>
      </div>
    </li>
  );
};
