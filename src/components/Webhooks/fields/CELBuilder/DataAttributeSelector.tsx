import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { SelectWithChevron } from '@/components/SelectWithChevron';
import React from 'react';
import { conditionsConfig } from '@/utils/webhook';

const dataAttributeOptions = [
  { value: '', label: 'Select attribute', isPlaceholder: true },
  ...conditionsConfig.map((c) => ({ value: c.field, label: c.label })),
];

export const DataAttributeSelector = ({ index }: { index: number }) => {
  const { register } = useFormContext<WebhookFormInput>();
  return (
    <SelectWithChevron
      {...register(`cel.conditions.${index}.field`, {
        required: 'Field is required',
      })}
      defaultValue=""
      options={dataAttributeOptions}
    />
  );
};
