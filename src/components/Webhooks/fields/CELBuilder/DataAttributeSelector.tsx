import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { SelectField } from '@/components/SelectField';
import React from 'react';
import { conditionsConfig } from '@/utils/webhook';

const dataAttributeOptions = conditionsConfig.map((c) => ({
  value: c.field,
  text: c.label,
}));

export const DataAttributeSelector = ({ index }: { index: number }) => {
  const { control } = useFormContext<WebhookFormInput>();
  return (
    <SelectField
      name={`cel.conditions.${index}.field`}
      control={control}
      options={dataAttributeOptions}
      placeholder="Select attribute"
    />
  );
};
