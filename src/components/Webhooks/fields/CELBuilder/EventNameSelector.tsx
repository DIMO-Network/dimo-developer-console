import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { SelectWithChevron } from '@/components/SelectWithChevron';
import React from 'react';
import { eventNamesByService } from '@/utils/webhook';

export const EventNameSelector = ({ service }: { service: string }) => {
  const { register } = useFormContext<WebhookFormInput>();

  const eventOptions = [
    { value: '', label: 'Select event', isPlaceholder: true },
    ...(eventNamesByService[service] ?? []),
  ];

  return (
    <SelectWithChevron
      {...register('cel.conditions.0.field', {
        required: 'Event name is required',
      })}
      defaultValue=""
      options={eventOptions}
    />
  );
};
