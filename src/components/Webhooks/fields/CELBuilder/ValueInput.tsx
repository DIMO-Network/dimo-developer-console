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

  if (config.inputType === 'number') {
    // @ts-expect-error validation type isn't strict enough
    const registerReturn = register(`cel.conditions.${index}.value`, config.validation);
    return (
      <div className={'text-field'}>
        <input {...registerReturn} placeholder="Enter a number" type="number" />
      </div>
    );
  }
  // Not registered here as well: SelectField's Controller would drop these rules.
  return (
    <SelectField
      name={`cel.conditions.${index}.value`}
      // @ts-expect-error validation type isn't strict enough
      rules={config.validation}
      control={control}
      options={booleanValueOptions}
      placeholder="Select value"
    />
  );
};
