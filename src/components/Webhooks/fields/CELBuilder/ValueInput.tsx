import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { useFindTriggerConfig } from '@/components/Webhooks/hooks/useFindTriggerConfig';
import { SelectField } from '@/components/SelectField';
import React from 'react';

const booleanValueOptions = [
  { value: '1', text: 'True' },
  { value: '0', text: 'False' },
];

export const ValueInput = ({ index }: { index: number }) => {
  const { register, control } = useFormContext<WebhookFormInput>();
  const config = useFindTriggerConfig(index);
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
    <SelectField
      name={`cel.conditions.${index}.value`}
      control={control}
      options={booleanValueOptions}
      placeholder="Select value"
    />
  );
};
