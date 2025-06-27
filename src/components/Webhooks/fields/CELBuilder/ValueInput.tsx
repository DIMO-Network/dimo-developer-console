import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { useTriggerBuilderConfig } from '@/components/Webhooks/hooks/useTriggerBuilderConfig';
import { SelectWithChevron } from '@/components/SelectWithChevron';
import React from 'react';

const booleanValueOptions = [
  { value: '', label: 'Select value', isPlaceholder: true },
  { value: 1, label: 'True' },
  { value: 0, label: 'False' },
];

export const ValueInput = ({ index }: { index: number }) => {
  const { register } = useFormContext<WebhookFormInput>();
  const config = useTriggerBuilderConfig(index);
  // @ts-expect-error validation type isn't strict enough
  const registerReturn = register(`cel.conditions.${index}.value`, config.validation);

  if (config.inputType === 'number') {
    return (
      <div className={'text-field'}>
        <input {...registerReturn} placeholder="Enter a number" type="number" />
      </div>
    );
  }
  return (
    <SelectWithChevron
      {...registerReturn}
      defaultValue=""
      options={booleanValueOptions}
    />
  );
};
