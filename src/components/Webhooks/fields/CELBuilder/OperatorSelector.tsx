import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { useFindTriggerConfig } from '@/components/Webhooks/hooks/useFindTriggerConfig';
import { SelectField } from '@/components/SelectField';
import React from 'react';
import { InputType } from '@/utils/webhook';

const numberOperatorOptions = [
  { text: 'is equal to', value: '==' },
  { text: 'is greater than', value: '>' },
  { text: 'is less than', value: '<' },
];
const booleanOperatorOptions = [{ text: 'is equal to', value: '==' }];

const getOperatorOptions = (inputType: InputType) =>
  inputType === 'number' ? numberOperatorOptions : booleanOperatorOptions;

export const OperatorSelector = ({ index }: { index: number }) => {
  const { control } = useFormContext<WebhookFormInput>();
  const config = useFindTriggerConfig(index);
  return (
    <SelectField
      name={`cel.conditions.${index}.operator`}
      control={control}
      options={getOperatorOptions(config.inputType)}
      placeholder="Select operator"
    />
  );
};
