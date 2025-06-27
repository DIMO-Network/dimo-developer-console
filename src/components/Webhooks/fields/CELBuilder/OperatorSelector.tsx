import { InputType } from 'node:zlib';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { useFindTriggerConfig } from '@/components/Webhooks/hooks/useFindTriggerConfig';
import { SelectWithChevron } from '@/components/SelectWithChevron';
import React from 'react';

const numberOperatorOptions = [
  { label: 'is equal to', value: '==' },
  { label: 'is greater than', value: '>' },
  { label: 'is less than', value: '<' },
];
const booleanOperatorOptions = [{ label: 'is equal to', value: '==' }];

const getOperatorOptions = (inputType: InputType) => {
  return inputType === 'number' ? numberOperatorOptions : booleanOperatorOptions;
};

export const OperatorSelector = ({ index }: { index: number }) => {
  const { register } = useFormContext<WebhookFormInput>();
  const config = useFindTriggerConfig(index);
  return (
    <SelectWithChevron
      {...register(`cel.conditions.${index}.operator`, {
        required: 'Operator is required',
      })}
      defaultValue=""
      options={[
        { value: '', label: 'Select operator', isPlaceholder: true },
        ...getOperatorOptions(config.inputType),
      ]}
    />
  );
};
