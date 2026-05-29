import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { SelectField } from '@/components/SelectField';
import React from 'react';
import { eventNamesByService } from '@/utils/webhook';

export const EventNameSelector = ({ service }: { service: string }) => {
  const { control } = useFormContext<WebhookFormInput>();

  const eventOptions = (eventNamesByService[service] ?? []).map(({ value, label }) => ({
    value,
    text: label,
  }));

  return (
    <SelectField
      name="cel.conditions.0.field"
      control={control}
      options={eventOptions}
      placeholder="Select event"
    />
  );
};
